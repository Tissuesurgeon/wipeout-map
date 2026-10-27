# How to check an account is healthy

This guide shows you how to ask whether an account is configured the way it should be, and how to
present the answer without overstating it. It assumes a read-only client.

## Two halves, on purpose

`readHealthFacts` gathers facts off a chain. `evaluateHealth` judges them, and is **pure** — so the
conditions are testable without a chain, and a UI can re-evaluate without re-reading.

```ts
import {evaluateHealth, readHealthFacts} from "@somnia-chain/accounts-sdk";

const facts = await readHealthFacts(client, {account, chainId});
const report = evaluateHealth(facts);

report.band; // "critical" | "high" | "medium" | "low" | "info" | null
report.findings; // only the checks that found something
report.inconclusive; // how many could not be evaluated
```

## Read the band, not a score

`band` is the **worst** finding's severity, or `null` when there are none. It is deliberately not an
average: nine passes and one catastrophe average to green, and green is what a user acts on.

A `critical` finding caps the band at critical no matter how much else passed.

## `inconclusive` is not a pass

Every fact on `HealthFacts` can be `undefined`, meaning _the read did not answer_ — distinct from
any particular value. A check over a fact that is missing comes back `inconclusive` rather than
`ok`, and `report.inconclusive` counts them.

**Show that number.** Folding it into the band would let an account with unreadable state present as
healthy, which is the failure this shape exists to prevent.

```ts
import {evaluateHealth, readHealthFacts} from "@somnia-chain/accounts-sdk";

const report = evaluateHealth(await readHealthFacts(client, {account, chainId}));
if (report.band === null && report.inconclusive > 0) {
  // "Nothing wrong found, but N checks could not run" — NOT "healthy".
}
```

## Across chains

The account has the same address on every chain and **different state behind it**, which is where
most real findings come from: a grant that ran out of gas on one network.

```ts
import {evaluateHealth, readHealthFacts} from "@somnia-chain/accounts-sdk";

const facts = await readHealthFacts(client, {
  account,
  chainId,
  // Compare against the other chains. Findings then include "this chain disagrees".
  across: [{client, chainId: 50312}],
  chainName: (id) => (id === 5031 ? "Somnia" : `chain ${id}`),
});
void evaluateHealth(facts);
```

`chainName` is there so a finding reads as a sentence about a network rather than about a number.

## What the facts cover

| Fact                     | Why it is checked                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `deployed`               | code at the address on this chain                                                                                  |
| `owners`, `threshold`    | the authority, and whether it is the shape you intended                                                            |
| `accountOwners`          | which owners are themselves accounts                                                                               |
| `version`                | the Safe version behind the proxy                                                                                  |
| `modules`, `moreModules` | anything with module authority. `moreModules` means the list was a **prefix**, so "no modules" cannot be concluded |
| `guard`, `moduleGuard`   | policy contracts that can veto                                                                                     |
| `fallbackHandler`        | what answers `isValidSignature` — without one, EIP-1271 does not work at all                                       |
| `singleton`              | the implementation in the proxy's slot 0                                                                           |
| `expected`               | what the factory installs **today**, to compare against                                                            |
| derivation               | the key and index the address was proven to come from                                                              |

`moreModules` is the subtle one: a truncated list that read as complete would report "no modules" on
an account that has one. `configOf` reads modules a page at a time — **ten by default** — and sets
`moreModules` when the page came back full, so an account with more than ten needs another read
before "these are its modules" is a true sentence. Pass `modulePageSize` to widen it.

## Assembling facts yourself

If you already hold some of this — an owner set you read for another panel — skip the re-read:

```ts
import {assembleHealthFacts, evaluateHealth} from "@somnia-chain/accounts-sdk";

// Every part is nameable, and `undefined` means "this was not read" rather than "nothing there" —
// so a panel that already holds the owner set can judge on it without re-reading, and the checks
// it could not run come back inconclusive instead of passing.
const facts = assembleHealthFacts({
  account,
  chainId,
  deployed: true,
  owners,
  config: undefined,
  expected: undefined,
  custody: undefined,
  setups: undefined,
});
void evaluateHealth(facts);
```

## Presenting the checks

Each entry in `report.checks` is a `Check`:

```ts
import {compareSeverity, type Check} from "@somnia-chain/accounts-sdk";

function render(checks: readonly Check[]) {
  // Worst first. Exported so a view does not restate the severity order.
  return [...checks]
    .sort((a, b) => compareSeverity(a.severity, b.severity))
    .map((c) => ({
      title: c.title, // names the CHECK — "Across chains"
      headline: c.headline, // names the ANSWER, and is the line to show when there is room for one
      status: c.status, // "ok" | "finding" | "inconclusive"
      severity: c.severity, // meaningful only on a finding; an `ok` check carries "info"
    }));
}
void render;
```

`title` and `headline` are deliberately separate. A card showing the title read "Across chains",
which names the question rather than the answer — `headline` is the answer.

`simpleMajority(owners)` is Safe's own definition, `floor(n/2) + 1`, exported because the even case
is the one that gets guessed wrong: **2-of-4 is not a majority**, it is a tie either half can break.

## The stranded state

An account whose owners are **all** rotated away is reachable, funded, and controlled by nobody you
know. The address survives owner rotation, so this is a real state rather than a theoretical one,
and there is no step out of it. Health reports it; nothing can fix it.

## Related

- [How to find an account](./find-an-account.md)
- [How to grant and revoke a session key](./grant-and-revoke-a-session-key.md)
