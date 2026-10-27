# Architecture

How the package is put together: what each module owns, which direction the dependencies run, and
where the seams are. For _why_ it is shaped this way, see
[About data-first design](./explanation/about-data-first-design.md).

## The layers

Dependencies run downward only. Nothing below reaches up.

```
                    ┌─────────────────────────────────────┐
     vocabulary     │ sub-accounts   transfer   health    │  thin, named for what
                    │                                     │  a caller is trying to do
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
     operations     │ factory   authorization   execute   │  plan → sign → send
                    │ prepare   submit                    │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
     primitives     │ safe-tx   signatures   safe         │  Safe's own formats
                    │ address   discovery    revert       │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
     facts          │ contracts   abi/generated   errors  │  no logic, no network
                    │ call                                │
                    └─────────────────────────────────────┘
```

## What each module owns

### Facts

| Module           | Owns                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `contracts.ts`   | addresses, per chain and salt version. Reads `generated/deployments.ts`, which the build writes from the committed manifests |
| `abi/generated/` | the ABIs, produced from `smart-contracts/out/` and gated by `mise run abis-check`                                            |
| `call.ts`        | `Call`, and `SenderBoundCall` — the one call that is not submittable by anyone                                               |
| `errors.ts`      | every failure, one class per branchable outcome, one shared base                                                             |

`errors.ts` is deliberately one file. A consumer that cannot write
`catch (e) { if (e instanceof SomniaAccountsError) … }` has to enumerate class names by hand and
gets them wrong the first time we add one.

### Primitives

| Module                 | Owns                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `address.ts`           | the derivation: `CREATE3(factory, keccak256(abi.encode(accountId, index)))`                                      |
| `safe-tx.ts`           | building a Safe transaction, its EIP-712 hash, `execTransaction` calldata, `MultiSendCallOnly` batching          |
| `signatures.ts`        | packing the `signatures` blob — the three interlocking layout rules, plus the pre-validated fourth               |
| `safe.ts`              | owner management calldata, and the linked-list arithmetic `prevOwner` hides                                      |
| `discovery.ts`         | scanning by derivation, reading owner sets, walking the ownership graph up and down                              |
| `revert.ts`            | why a transaction reverted, by replaying it at the block it landed in                                            |
| `safe-errors.ts`       | Safe's `GSxxx` codes as sentences, cross-checked against the vendored contracts                                  |
| `account-config.ts`    | modules, guards, the fallback handler, the singleton — and offline address attribution                           |
| `indexer.ts`           | the indexed reads: reverse lookup, history and network feeds, the factory, freshness — chain ids in, never a URL |
| `indexer-endpoints.ts` | the indexers we run, per chain, and the one process-wide override (`configureIndexer`)                           |

### Operations

| Module             | Owns                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `factory.ts`       | `createAccount`, the gas constants, reading the factory back                                           |
| `authorization.ts` | the chain-agnostic EIP-712 surface: one signature, every chain                                         |
| `execute.ts`       | making an account act, including through a chain of accounts                                           |
| `prepare.ts`       | the split between signing and paying, gas measurement, `signAndSubmit`                                 |
| `submit.ts`        | getting signed bytes onto a chain: which RPC method, which fields, and that a receipt is not a success |
| `wallet-signer.ts` | an EIP-1193 provider as a signer and a sender                                                          |

### Vocabulary

| Module                          | Owns                                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `sub-accounts.ts`               | the sub-account words over the general functions. **Thin on purpose** — a sub-account is an ordinary account whose owner is an account |
| `transfer.ts`                   | moving value, with the direction in the signature rather than in a comment                                                             |
| `health.ts` / `health-reads.ts` | what is wrong with an account. Split so the evaluator is pure                                                                          |

## The three seams

**1. Plan / sign / send.** Every write is three decisions, and they are three values:

```
planExecution ──> ExecutionPlan ──> prepareExecution ──> Prepared ──> toCall(sig) ──> Call
                  (pure)                                 (pure)                      (data)
```

A caller can stop at any of them. The accounts SDK never has to be the thing that sends.

**2. Read / judge.** `readHealthFacts` gathers, `evaluateHealth` decides, and the second is pure —
so the conditions are testable without a chain and a UI can re-judge without re-reading.

**3. Signer / sender.** Two arguments, because the four combinations are all real: owner EOA or
session key, signing only or also paying. `execTransaction` checks signatures rather than
`msg.sender`, which is what makes the split possible at all.

## Where state lives

Nowhere in the package. What exists are **values the caller holds**: `ExecutionPlan`, `Prepared`,
`SignedAccountAuthorization`. Each survives being written to a database and read back somewhere
else, which is the test for whether it is a value or a session.

## Generated files, and their gates

A generated file without a staleness gate will be stale. Every one here has one:

| File                           | Generator                           | Gate                                 |
| ------------------------------ | ----------------------------------- | ------------------------------------ |
| `src/abi/generated/`           | `scripts/generate-abis.mjs`         | `mise run abis-check`                |
| `src/generated/deployments.ts` | `scripts/generate-deployments.mjs`  | regenerated during `build`           |
| `test/generated/doc-examples/` | `scripts/generate-doc-examples.mjs` | `pnpm docs:examples-check`           |
| `docs/api/`                    | `typedoc`                           | `pnpm docs:lint`, warnings as errors |

`docs/api/` is the one that is not committed: it derives entirely from doc comments, so storing it
would be a diff on every comment edit and a conflict on every branch. Regenerating it and failing on
a warning catches the staleness that matters — a `{@link}` that resolves to nothing, a `@param`
naming an argument that no longer exists.

## What the package refuses to contain

- **A client.** See [About data-first design](./explanation/about-data-first-design.md).
- **A hand-written ABI.** No `parseAbi([...])`, no pasted JSON.
- **An address constant.** Every one comes from the manifests.
- **A unit conversion.** Amounts are raw `bigint` in the token's own decimals. A protocol quantity
  that passes through a float has been rounded.
- **A non-null assertion.** `present(value, "what should have been true")` raises `InvariantError`,
  which says the bug is ours.

## Verification

| Command                      | What it proves                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm typecheck`             | `src`, `test`, and every documentation example compile                                          |
| `pnpm test`                  | the unit suite, including the Safe error table against the vendored contracts                   |
| `pnpm docs:lint`             | the API reference builds with no unresolved reference                                           |
| `pnpm docs:examples-check`   | the extracted examples match the documents                                                      |
| `pnpm consumer:check` (root) | the **packed tarball** installs, imports under plain Node, and typechecks as a consumer sees it |

The last one is the only check that sees what a consumer sees. Every other test resolves the SDK
through a workspace symlink, which ignores `files`, `exports` and the shape of `dist` entirely —
markets once shipped a release nobody could import for exactly that reason.

## Related

- `RULES.md` in the repository — the normative catalog, with stable rule ids
- `STANDARDS.md` — the reasoning behind it
- `docs/contracts.md` — every deployed contract, per chain
