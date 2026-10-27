# How to handle errors and reverts

This guide shows you how to branch on what this SDK throws so a UI or a bot reacts correctly. The
complete table of classes and fields is in [Errors](../reference/errors.md).

## Branch on the class, most specific first

```ts
import {
  CannotPayError,
  InvalidInputError,
  RpcError,
  SomniaAccountsError,
  TransactionRevertedError,
  UnconfirmedSendError,
  WrongSenderError,
  signAndSubmit,
} from "@somnia-chain/accounts-sdk";

try {
  await signAndSubmit(client, {prepared, signer, sender, chain});
} catch (e) {
  if (e instanceof UnconfirmedSendError) {
    // NOT a failure. Re-check `e.hash` before doing anything else.
  } else if (e instanceof TransactionRevertedError) {
    // Mined and reverted. Nothing changed. `e.reason` where it could be decoded.
  } else if (e instanceof CannotPayError) {
    // Top up `e.address`, then retry.
  } else if (e instanceof WrongSenderError) {
    // The call is only valid from `e.required`. A programming error, not a retry.
  } else if (e instanceof InvalidInputError) {
    // Fix the arguments. Do not retry.
  } else if (e instanceof RpcError) {
    // The request did not complete. Retry with backoff, or degrade.
  } else if (e instanceof SomniaAccountsError) {
    // Anything else of ours.
  } else {
    throw e; // not ours: a wallet, or a bug in your own code
  }
}
```

**Message text is not stable. The fields are.**

## The one that is usually got wrong

`UnconfirmedSendError` means **waiting stopped**, not that the transaction failed. The hash is real
and the transaction may still land.

Retrying on it sends a second transaction for work that may already have happened — a second account
creation is harmless because creation is idempotent, but a second transfer is not. Treat it as
_unknown_: re-check the hash, then decide.

```ts
import {UnconfirmedSendError, submitCall} from "@somnia-chain/accounts-sdk";
import {getTransactionReceipt} from "viem/actions";

try {
  await submitCall(client, {chain, sender, call, gas: 2_000_000n});
} catch (e) {
  if (!(e instanceof UnconfirmedSendError)) throw e;
  // Ask the chain what actually happened before deciding to retry.
  const landed = await getTransactionReceipt(client, {hash: e.hash}).catch(() => null);
  if (landed?.status === "success") {
    // It worked. Do not send it again.
  }
}
```

## Why it reverted

A receipt carries no revert data at any Safe version, so the reason comes from replaying the call at
the block it landed in. `submitCall` and `signAndSubmit` do that for you and put the result on
`TransactionRevertedError.reason`.

It is **best-effort**: a node that cannot replay the block, or a revert with nothing decodable in it,
leaves `reason` undefined. Render that case as "it reverted" rather than as an empty reason.

## Name your own protocol's reverts

The SDK knows Solidity's built-in errors and ERC-20's. It cannot know yours:

```ts
import {submitCall} from "@somnia-chain/accounts-sdk";

await submitCall(client, {
  chain,
  sender,
  call,
  gas: 2_000_000n,
  // Now a revert in your contracts is named instead of being an unknown selector.
  errors: [{type: "error", name: "PostOnlyWouldCross", inputs: []}],
});
```

## Turn a Safe code into a sentence

```ts
import {explainSafeError, isRetryable} from "@somnia-chain/accounts-sdk";

// All of these take the ERROR. They dig the code out themselves — you do not extract it first.
function render(caught: unknown): string {
  const explained = explainSafeError(caught);
  if (explained === undefined) return "it reverted"; // no Safe code in there
  const again = isRetryable(caught) ? " Worth retrying." : "";
  // When `readings` is present, `message` is only a SUMMARY — show the readings as the diagnosis
  // instead, and narrow them if your flow can rule some out.
  if (explained.readings !== undefined) {
    return explained.readings.map((r) => r.cause).join(" — or — ") + again;
  }
  return explained.message + again;
}
void render;
```

`GS026` alone means _invalid signature_ **or** _signers out of ascending order_ **or** _a repeated
owner_ — three different bugs. The SDK sorts signature entries for you precisely because the code
gives a caller nothing to distinguish them by.

## A receipt is not a success

If you broadcast bytes yourself rather than through `submitCall`, **assert `receipt.status`.** An
out-of-gas revert produces a real receipt with a real hash and an account that does not exist. On
Somnia the gas floors are high enough that this is an ordinary outcome, not a theoretical one — see
[Gas](../reference/gas.md).

## Related

- [Errors](../reference/errors.md)
- [Gas](../reference/gas.md)
