# Safe transactions

The layer under `planExecution`: what a Safe transaction is, how it is hashed, how several calls
become one, and the ABIs. Reach for this when you are assembling the outer transaction yourself
rather than going through [an execution plan](../how-to/integrate-with-another-sdk.md).

## `SafeTx`

What an account executes. One of these, signed by enough owners, becomes one `execTransaction`.

```ts
import type {Address, Hex} from "viem";
import type {SafeOperationValue} from "@somnia-chain/accounts-sdk";

interface SafeTx {
  readonly to: Address; // where the ACCOUNT sends the call
  readonly value: bigint; // wei, paid out of the ACCOUNT's balance — not attached by the sender
  readonly data: Hex;
  readonly operation: SafeOperationValue; // Call, or DelegateCall for a batch
  readonly nonce: bigint; // the account's `nonce()` at signing time
}
void {} as unknown as SafeTx;
```

`value` comes out of the account, not the submitter's wallet. `execTransaction` is `payable`, but
this SDK always sends zero value with it — the escrow is the account's own balance.

## `SafeOperation`

<!-- docexample: run -->

```ts
import {SafeOperation} from "@somnia-chain/accounts-sdk";

SafeOperation.Call; // => 0
SafeOperation.DelegateCall; // => 1
```

A batch is a `DelegateCall` to `MultiSendCallOnly`, which is what keeps the account as `msg.sender`
for every inner call. **`MultiSendCallOnly`, never `MultiSend`** — see below.

## Building one

```ts
import {batchedSafeTx, buildSafeTx, contractAddress} from "@somnia-chain/accounts-sdk";

// Chain-aware: resolves `MultiSendCallOnly` from the manifests.
const tx = buildSafeTx(chainId, calls, 4n);

// Pure: for a caller that resolved the batcher itself, or is testing against a substitute.
const same = batchedSafeTx(contractAddress(chainId, "MultiSendCallOnly"), calls, 4n);
void [tx, same];
```

Both are **pure**. The nonce is a parameter rather than a read, because you may already be tracking
it; `readSafeNonce(client, account)` is the one read, kept separate for that reason.

A single call is sent as a `Call` operation; several are packed. `encodeMultiSendCalls(calls)` gives
you the packed bytes alone.

### `MultiSend` versus `MultiSendCallOnly`

**They take identical calldata and grant different authority, and no type system distinguishes
them.** `MultiSend` permits a nested `delegatecall`, so one entry in a batch can rewrite the
account's own storage — its owners, its modules, its implementation. `MultiSendCallOnly` cannot.

This SDK uses `MultiSendCallOnly` everywhere, and `batchedSafeTx` names the distinction in its own
signature. Both addresses are in the manifests because an operator needs to look either up; if your
integration takes a batcher address as configuration, this is the mistake worth a comment.

## Hashing it

```ts
import {safeTxHash, safeTxTypedData, SAFE_TX_TYPES} from "@somnia-chain/accounts-sdk";

const digest = safeTxHash(chainId, account, plan.tx); // what owners must satisfy
const payload = safeTxTypedData(chainId, account, plan.tx); // the EIP-712 payload to render
void [digest, payload, SAFE_TX_TYPES];
```

**Safe's domain contains the chain id.** So a Safe transaction is always chain-bound: the same
transaction is a different message on every network, and an injected wallet will validate
`domain.chainId` against its selected network before signing. That is why `Prepared.chainBound` is
`true` for everything signed _for_ an account, and why the account
[authorization](./authorization.md) — whose domain omits `chainId` — is the one thing that reaches
every chain from one signature.

`safeTxGas`, `baseGas`, `gasPrice`, `gasToken` and `refundReceiver` are all part of what Safe
hashes; this SDK sets them to zero and the zero address. That choice has a consequence worth
knowing — see _Swallowed reverts_ below.

## The outer transaction

```ts
import {
  encodeExecTransaction,
  execTransactionCall,
  packSignatures,
} from "@somnia-chain/accounts-sdk";

const blob = packSignatures([{kind: "key", signer: owner, signature}]);
const outer = execTransactionCall(account, plan.tx, blob); // {to, value, data}
const bytes = encodeExecTransaction(plan.tx, blob); // calldata alone
void [outer, bytes];
```

`execTransactionCall` is the one to reach for, because **the target is the part that goes wrong**:
these bytes sent anywhere but the acting account revert. `encodeExecTransaction` exists for a caller
assembling the transaction itself.

### Swallowed reverts

**A Safe can swallow an inner revert**: the outer transaction mines with `status: "success"` while a
failure event says the inner call did not run. Which path it takes depends on the gas fields.

Because `execTransactionCall` sets `safeTxGas` and `gasPrice` to zero — no gas accounting, no refund
— a Safe **reverts the outer transaction** on an inner failure rather than emitting
`ExecutionFailure`. So the failure arrives as a reverted receipt, which `submitCall` already turns
into a `TransactionRevertedError`.

On Safe 1.3/1.4 that revert carried the string `GS013`. **1.5.0 does not emit it** — and 1.5.0 is
what our factory deploys — so do not branch on that code: the mechanism survived the version, the
code did not. See [Errors](./errors.md).

If you build the outer call yourself with non-zero gas fields, you are back on the swallowing path
and have to inspect `receipt.logs` for `ExecutionFailure` and `ExecutionFromModuleFailure`.

## Signing through an account

The lower-level pieces behind [nested execution](../explanation/about-accounts-owning-accounts.md),
for a caller that needs the digests rather than the plan:

| Function                                           | What it is                                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `safeDomainSeparator(chainId, safe)`               | an account's EIP-712 domain separator, computed offline                                                                        |
| `safeMessageHash(chainId, safe, message)`          | what an owner must sign for the account to accept a **message** — mirrors `CompatibilityFallbackHandler.getMessageHashForSafe` |
| `parentApprovalHash(chainId, parent, childTxHash)` | the composition callers actually need: what a parent's owners sign so the parent approves a child's transaction                |
| `nestedSignature(parent, parentSignature)`         | wrap a parent's signature so a child accepts it, as an EIP-1271 contract signature                                             |
| `nestThrough(signature, through)`                  | fold one key's signature back through a whole chain, nearest parent outermost                                                  |
| `packSignatures(entries)`                          | the blob, sorted, with offsets computed after the whole static part                                                            |

**A parent must have a fallback handler installed.** The EIP-1271 check reaches the account through
it, and an account with no handler cannot answer `isValidSignature` at all. Our factory installs one
at creation, so this holds for anything it made — worth knowing if you point this SDK at a Safe from
elsewhere.

## Reading an account's nonce

```ts
import {readSafeNonce} from "@somnia-chain/accounts-sdk";

const nonce = await readSafeNonce(client, account);
void nonce;
```

**Only the acting account's nonce matters**, however deep the authority chain. A parent approves a
message rather than executing a transaction, so it has no nonce that enters this.

## The ABIs

Generated from the compiled contracts, committed, and gated by `mise run abis-check`. All `as const`,
so viem infers argument and return types from them.

| Export                            | Contract                                                       |
| --------------------------------- | -------------------------------------------------------------- |
| `safeAbi`                         | the account                                                    |
| `somniaAccountFactoryAbi`         | the factory                                                    |
| `multiSendCallOnlyAbi`            | the batcher this SDK uses                                      |
| `multiSendAbi`                    | the batcher it does not — present because operators look it up |
| `compatibilityFallbackHandlerAbi` | what answers `isValidSignature`                                |
| `erc20Abi`                        | the minimum for balances and transfers                         |

**Never hand-write one.** No `parseAbi([...])`, no pasted JSON. A four-entry Safe ABI compiles,
works, and then silently disagrees with the deployed contract after an upgrade — which is the
failure this package exists to prevent.

## Storage slots

```ts
import {SAFE_SLOTS, SENTINEL_MODULES, SENTINEL_OWNERS} from "@somnia-chain/accounts-sdk";

void [SAFE_SLOTS, SENTINEL_MODULES, SENTINEL_OWNERS];
```

`SAFE_SLOTS` is what `configOf` reads directly out of storage — the singleton in slot 0, the guard,
the module guard, the fallback handler — because Safe exposes no getter for some of them. The
sentinels are the heads of Safe's two linked lists; `prevOwner` is the lookup that hides the owner
one.

## Related

- [The call, and who may send it](./the-call-and-who-may-send-it.md)
- [Gas](./gas.md)
- [About accounts owning accounts](../explanation/about-accounts-owning-accounts.md)
