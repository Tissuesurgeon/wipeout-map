# Errors

Every failure this SDK raises, what it means, and what to branch on.

## The family

All of them extend `SomniaAccountsError`, so one test tells you whether a failure was ours:

```ts
import {SomniaAccountsError} from "@somnia-chain/accounts-sdk";

try {
  await Promise.resolve();
} catch (e) {
  if (e instanceof SomniaAccountsError) {
    // ours: `e.message` is built from typed fields, and `e.cause` has whatever caused it
  } else {
    throw e; // a wallet, a transport, or a bug in your own code
  }
}
```

**Branch on the class and read the fields. Do not match on the message.** The fields are the API;
the wording is not. Each class sets `name` to its own class name explicitly, so a minified bundle
still logs a readable one.

**Nothing raw escapes.** A wallet that answers badly is a `WalletResponseError`, a chain that does
not answer is an `RpcError`, an argument refused offline is an `InvalidInputError` rather than a
`RangeError`. Whatever caused a failure is chained in `cause`, never swallowed.

## The classes

### Your input

| Class               | Fields | Means                                                                                  |
| ------------------- | ------ | -------------------------------------------------------------------------------------- |
| `InvalidInputError` | —      | An argument this SDK could refuse without a chain. Fix the call; do not retry.         |
| `InvariantError`    | —      | A condition the SDK believed could not happen. **The bug is ours** — please report it. |

`present(value, "what should have been true")` is the invariant helper used instead of non-null
assertions, and it raises `InvariantError`.

### Deployment and chains

| Class                      | Fields                    | Means                                                             |
| -------------------------- | ------------------------- | ----------------------------------------------------------------- |
| `UnsupportedChainError`    | `chainId`                 | Nothing is committed for that chain.                              |
| `MissingContractError`     | `chainId`, `contractName` | The chain is covered; that name is not in its manifest.           |
| `AmbiguousDeploymentError` | `chainId`, `saltVersions` | Several salt versions are committed. Pass `saltVersion`.          |
| `WrongNetworkError`        | `expected`, `actual`      | The client is pinned to a different chain than the call is about. |

See [Addresses and chains](./addresses-and-chains.md) for why these throw rather than returning
`undefined`.

### Authority

| Class              | Fields                        | Means                                                                                                                                                                                                                |
| ------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WrongSignerError` | `required`, `offered`         | A signature recovered to the wrong address.                                                                                                                                                                          |
| `WrongSenderError` | `required`, `offered \| null` | The call may only be **sent** by one address, and this is not it. `offered` is `null` for a relayer, whose address cannot be checked.                                                                                |
| `NotAnOwnerError`  | `owner`, `owners`             | An owner action named an address the account does not have as an owner. Raised offline against the owner list that was read, rather than letting Safe answer `GS026` from inside a transaction you already paid for. |

`WrongSignerError` and `WrongSenderError` are deliberately distinct: one means nothing valid was
signed, the other means the right call is in the wrong hands. See
[The call, and who may send it](./the-call-and-who-may-send-it.md).

### Paying and sending

| Class                      | Fields                          | Means                                                                                    |
| -------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `SenderRequiredError`      | `signer`                        | That address can sign but cannot send. Pass a sender — a relayer, or a wallet that pays. |
| `CannotPayError`           | `address`                       | The sender's balance will not cover the transaction.                                     |
| `UnconfirmedSendError`     | `hash`                          | **Waiting stopped. The transaction may still land.** Not a failure.                      |
| `TransactionRevertedError` | `hash`, `blockNumber`, `reason` | Mined and reverted. Nothing changed.                                                     |

`UnconfirmedSendError` is the one most likely to be mishandled. It does **not** mean the transaction
failed — it means the SDK stopped waiting. Treat it as "unknown", not as "no": re-check the hash
before retrying, or you will send a second transaction for work that already happened.

### The wallet

| Class                    | Fields   | Means                                                                                                                                                                                 |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WalletResponseError`    | `method` | The wallet answered with something unusable — a malformed signature, a send that returned no hash, a recovery id out of range. The remedy is usually a different wallet, not a retry. |
| `UnsupportedMethodError` | `method` | The wallet does not implement that RPC method.                                                                                                                                        |
| `RpcError`               | —        | The chain or transport did not answer. Retry with backoff.                                                                                                                            |

The distinction between `WalletResponseError` and `RpcError` is **who misbehaved**: the wallet the
user chose, or the node.

### The indexer

| Class                      | Fields         | Means                                                                                                                                     |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `IndexerUnavailableError`  | `retryAfterMs` | Rate-limited, overloaded or unreachable. A subclass of `RpcError`. Wait `retryAfterMs` when given, then ask again.                        |
| `FeedRestartRequiredError` | `chainId`      | The index was rebuilt since the feed's cursor was issued. Continuing would skip or repeat rows, so start the read again without a cursor. |

## Why a transaction reverted

A receipt carries no revert data at any Safe version, so the only route to a reason is replaying the
call at the block it landed in. `submitCall` does that for you, and the decoded reason lands on
`TransactionRevertedError.reason` — best-effort by construction: a node that cannot replay the block,
or a revert with nothing decodable in it, leaves `reason` undefined.

```ts
import {decodeRevertData, replayForRevert, revertReason} from "@somnia-chain/accounts-sdk";

// If you send the bytes yourself, this is the same path: replay the call at the block it
// landed in. `to` is the account for an `execTransaction`, and `data` is the calldata that
// reverted. `null` means nothing better than "it reverted" can be said.
const reason = await revertReason(client, {
  to: account,
  data: call.data,
  blockNumber: receipt.blockNumber,
  from: sender.address,
});
void [reason, decodeRevertData, replayForRevert];
```

`revertReason` answers with a `DecodedRevert` or `null`:

```ts
import type {DecodedRevert} from "@somnia-chain/accounts-sdk";

function render(decoded: DecodedRevert | null): string {
  // `null` is "nothing better than 'it reverted' can be said" — render that, not an empty reason.
  if (decoded === null) return "it reverted";
  return decoded.reason;
}
void render;
```

You can pass your own protocol's error ABI to `submitCall` via `errors`, so a revert in _your_
contracts is named rather than reported as an unknown selector. The SDK knows Solidity's built-ins
and ERC-20's; it cannot know yours.

## Safe's own codes

Safe reverts with short codes — `GS020`, `GS025`, `GS026` — that mean several things each and
explain none of them.

```ts
import {
  explainSafeError,
  isRetryable,
  safeErrorCode,
  KNOWN_SAFE_ERRORS,
} from "@somnia-chain/accounts-sdk";

// Pass the ERROR, not a code you extracted yourself — all three dig the code out for you.
const caught: unknown = new Error("execution reverted: GS026");

const explained = explainSafeError(caught); // SafeError | undefined
if (explained !== undefined) {
  explained.code; // "GS026"
  explained.message; // one sentence, for a person
  explained.retryable; // whether the same bytes might succeed later
  // Set when one code covers several distinct causes. **Present means "do not show `message` as
  // the diagnosis"** — it is a summary, and the readings are the actual possibilities. A UI that
  // has ruled some out should say the rest.
  explained.readings; // readonly {cause: string; retryable: boolean}[] | undefined
}

safeErrorCode(caught); // "GS026" | undefined, if you want only the code
isRetryable(caught); // the `retryable` flag, or false when the code is unknown
void KNOWN_SAFE_ERRORS; // the whole table
```

**`retryable` is load-bearing rather than informational.** It is the flag a submit path reads to
decide whether to re-sign, and getting it wrong in the `true` direction produces an infinite loop of
wallet prompts. `isRetryable` returns `false` for anything it cannot recognise, which is the safe
direction.

**Prefer `isRetryable(error)` over reading `retryable` yourself.** When `readings` is present it is
the readings' flags that decide — `isRetryable` returns true if _any_ of them is retryable, where
the top-level `retryable` is the summary. Reading the summary on a multi-cause code is the guard a
consumer was missing once.

The table tracks Safe 1.5.0, and a test cross-checks it against the vendored contracts so it cannot
drift from what they actually emit — that check already caught a `GS013` entry Safe 1.5.0 cannot
emit.

The ones worth knowing by sight, with the table's own wording:

| Code    | The SDK's sentence                                       | Also means, here                                                                                          |
| ------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GS020` | Signatures were missing entirely.                        |                                                                                                           |
| `GS021` | A signature was malformed.                               |                                                                                                           |
| `GS022` | A contract signature pointed outside the data given.     | a hand-built nested blob with a wrong offset                                                              |
| `GS025` | An owner approved a different transaction than this one. | **a pre-validated entry with neither `msg.sender` nor an `approveHash` behind it** — the usual cause here |
| `GS026` | The signature was not accepted for this transaction.     | not an owner, **or** signers out of ascending order, **or** a repeated owner                              |
| `GS030` | Only the account itself may make this change.            | an owner function called from outside `execTransaction`                                                   |
| `GS031` | The account must be set up before this is allowed.       |                                                                                                           |

`GS026` is why this module is not a `Record<string, string>`: one code covers three situations whose
correct responses differ in kind — "try again", "you cannot do this", and "sign again over fresh
data". That is what `readings` carries, and `packSignatures` sorts for you precisely because the
code gives a caller nothing to distinguish them by.

### An unrecognised code is still named

`explainSafeError` returns `undefined` **only when there is no `GSxxx` code in the error at all.** A
code it has no sentence for still comes back, through a fallback:

<!-- docexample: run -->

```ts
import {explainSafeError, KNOWN_SAFE_ERRORS} from "@somnia-chain/accounts-sdk";

// A code with no sentence still comes back, named:
explainSafeError(new Error("reverted: GS013")); // => {code: "GS013", message: "The account rejected the transaction (GS013).", retryable: false}

// `undefined` means there was no GSxxx code in there at all:
explainSafeError(new Error("something else entirely")); // => undefined

// So THIS is how you ask whether the SDK understands a code:
KNOWN_SAFE_ERRORS.includes("GS013"); // => false
KNOWN_SAFE_ERRORS.includes("GS026"); // => true
```

Naming it beats passing viem's raw wall of text through, and `retryable: false` is the safe default:
a retry loop on an unknown code is the failure mode that costs real money in wallet prompts.

**So test `KNOWN_SAFE_ERRORS.includes(code)`, not `explained !== undefined`, when you want to know
whether the SDK actually understands a code.** The presence of a `SafeError` is not the same as the
presence of a diagnosis.

### `GS013` is the code to stop quoting

**Safe 1.5.0 does not emit `GS013`**, and 1.5.0 is what our factory deploys. It is a 1.3/1.4 code,
and the mechanism it described — a failed inner call reverting the whole `execTransaction` — is
still entirely real, which is exactly why it is easy to keep quoting from memory.

It is deliberately absent from the table, so `KNOWN_SAFE_ERRORS` does not contain it and the only
thing you get back is the generic fallback above. A test reads Safe's own vendored source and fails
if the table ever claims a code the contracts cannot emit — that check is what removed `GS013` in
the first place. Do not branch on it.

## Related

- [How to handle errors and reverts](../how-to/handle-errors-and-reverts.md)
- [Gas](./gas.md)
