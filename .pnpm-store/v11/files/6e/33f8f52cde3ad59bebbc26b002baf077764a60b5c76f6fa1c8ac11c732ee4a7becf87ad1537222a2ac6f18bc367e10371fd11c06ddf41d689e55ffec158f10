# The call, and who may send it

Every write this SDK builds ends as a `Call`. Almost all of them may be broadcast by anybody. One
kind may not, and nothing in the triple shows the difference — so this page states the rule.

## `Call`

```ts
import type {Address, Hex} from "viem";

interface Call {
  readonly to: Address;
  readonly value: bigint; // wei; zero for everything in this SDK
  readonly data: Hex;
}
```

Encoders return the whole triple rather than bare calldata, because **the target is the part that
goes wrong.** Safe's owner functions must be called on the account and nothing else, and calldata
alone leaves that to the caller to remember.

A `Call` is data. Returning it rather than sending it is what lets a relayer, a queue, a test double
or another SDK's send path take over — and it is why this package needs no runtime of its own.

## `SenderBoundCall`

```ts
import type {Address} from "viem";
import type {Call} from "@somnia-chain/accounts-sdk";

interface SenderBoundCall extends Call {
  /** The only address that may broadcast this call. */
  readonly sender: Address;
}
```

Produced by `prevalidatedExecution`, and by `signExecutionWith` when one of the entries is a
`"sender"` entry.

**The authority lives in who broadcasts, not in the bytes.** A pre-validated signature carries the
owner's address where a signature would go, and Safe honours it only when `msg.sender` is that
owner. So the same bytes are a valid authorisation from one address and worthless from every other.

Sent from the wrong address it reverts **`GS025`** — after the gas is spent, with nothing in the
receipt naming the sender as the cause.

## Recovering the restriction

`SenderBoundCall` is structurally a `Call`, so a value typed as `Call` does not show it. `isSenderBound`
narrows:

<!-- docexample: run -->

```ts
import {
  isSenderBound,
  prevalidatedSignature,
  type Call,
  type SenderBoundCall,
} from "@somnia-chain/accounts-sdk";

const OWNER = "0x000000000000000000000000000000000000dEaD" as const;
const plain: Call = {to: OWNER, value: 0n, data: "0x"};
const bound: SenderBoundCall = {to: OWNER, value: 0n, data: "0x", sender: OWNER};

// An ordinary call carries no sender, so anyone may broadcast it:
isSenderBound(plain); // => false

// One that names a sender is bound to it:
isSenderBound(bound); // => true

// And the pre-validated blob is 65 bytes: the address, a zero word, then v = 1.
prevalidatedSignature(OWNER).length; // => 132
prevalidatedSignature(OWNER).slice(-2); // => "01"
```

`submitCall` applies this itself, before broadcasting, and throws `WrongSenderError` on a mismatch.

## What refuses what

| Call              | `PayingWallet` whose address matches | A different `PayingWallet` | A `Relay`          |
| ----------------- | ------------------------------------ | -------------------------- | ------------------ |
| `Call`            | sends                                | sends                      | sends              |
| `SenderBoundCall` | sends                                | `WrongSenderError`         | `WrongSenderError` |

**A relayer is refused even though it might be the right address.** A `Relay` has no address by
design — it is asked to put bytes on a chain and to say which transaction that became — so the SDK
cannot tell a sponsor that happens to be the owner from one that is not. Refusing is the honest
answer; the alternative is a sponsored transaction that reverts for a reason nothing reports.

If you genuinely hold a relayer that _is_ the owner, build the call yourself:

```ts
import {execTransactionCall, prevalidatedSignature} from "@somnia-chain/accounts-sdk";

// Unbound by construction: you are asserting the sender, so you own the consequence.
const unchecked = execTransactionCall(account, plan.tx, prevalidatedSignature(sessionKey));
void unchecked;
```

## Matching is by value, not by spelling

`prevalidatedExecution` checksums the address it stores, and `submitCall` checksums the wallet's
before comparing. A wallet that reports a lowercase address still matches.

## Related

- [How to act without a signature](../how-to/act-without-a-signature.md)
- [Errors](./errors.md) — `WrongSenderError` vs `WrongSignerError`
- [Gas](./gas.md)
