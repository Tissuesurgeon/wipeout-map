# How to sign with a browser wallet

This guide shows you how to use an injected wallet — MetaMask, Rabby, anything EIP-1193 — as a
signer or a payer, and how to avoid the four failures every integration rediscovers.

## Wrap the provider

```ts
import {walletSigner} from "@somnia-chain/accounts-sdk";

// `window.ethereum` is not in the DOM types; every app declares it, one way or another.
const injected = (window as {ethereum?: unknown}).ethereum;

const signer = walletSigner({
  address: owner,
  getProvider: async () => injected as never,
  // `true` for a wallet the user brought. See below — this is the consequential field.
  external: true,
});
void signer;
```

`getProvider` is called **per send rather than held**, because a provider bound to a stale session
fails obscurely.

## `external` decides which RPC method is used, and the wrong one looks like your bug

An **embedded key** can sign a whole transaction, so the caller broadcasts the raw bytes itself and
the wallet's selected network never enters it. That is what keeps acting on a second chain to one
prompt.

An **injected wallet cannot**: `eth_signTransaction` is not a method MetaMask implements, and it
answers `-32602 "Missing or invalid parameters"` — which reads as a bug in your app rather than a
wrong call. This exact mistake shipped once: "Add this chain" failed for every wallet-only session
while working perfectly whenever an embedded key happened to pay.

**The SDK's own default is `false` — embedded** — because an embedded key is the one a caller is
least likely to think about. So a user-brought wallet has to be marked `external: true` explicitly;
leave it off and it gets asked for `eth_signTransaction`, which it does not implement.

If you are wrapping wallets whose kind you cannot always tell, default your _own_ resolution to
`true` and pass it down (`external: wallet.external ?? true`, which is what our explorer does). That
is the conservative direction: an embedded key treated as external costs at most a less readable
prompt, while the reverse costs a chain-switch dialog mid-flow — or, on a network the wallet has
never seen, an add-chain one.

It also affects **signing**, not only sending: an injected wallet validates `domain.chainId` against
its selected network, so it is offered the digest first, while an embedded key renders anything and
is offered typed data a person can actually read.

## Typed data or a digest depends on the payload, not the wallet

`Prepared.chainBound` says whether the payload names a `chainId`, and `signWith` uses it:

```ts
import {signWith} from "@somnia-chain/accounts-sdk";

// chainBound: true  -> an injected wallet gets the DIGEST, because it would otherwise validate
//                      `domain.chainId` against its selected network and demand a switch first.
// chainBound: false -> it gets the typed data, so the person can read what they are approving.
const sig = await signWith(signer, prepared);
void sig;
```

Safe's domain contains the chain id, so anything signed for the account is `chainBound: true`. The
account **authorization** is not — its domain omits `chainId` deliberately — so that one can be
rendered.

`signWith` falls back from typed data to the digest when a wallet refuses the domain, but **only on
a refusal**. A wallet answering with nonsense is a `WalletResponseError`, not a reason to sign
something else: papering over it would hand back a signature recovered against a different hash than
the caller believes was signed.

## Sanitising what a wallet hands back

```ts
import {sanitize, serializeTypedData} from "@somnia-chain/accounts-sdk";

// Some extensions inject values that break `JSON.stringify` on BigInt.
const payload = serializeTypedData(prepared.typedData);
void [payload, sanitize];
```

These exist because every consumer otherwise rediscovers the same four things: stringified typed
data, the reversed `eth_sign` parameter order, the BigInt corruption browser extensions inject, and
a wallet answering with something that is not a signature.

## The SDK never signs

It has no keys, no wallet and no session, and it should not. What it does own is **which shape a
signature has to be in** for the contract to accept it — typed data or a digest signed as a message,
Safe's `v + 4` marker distinguishing the second, a raw recovery id that must be lifted to 27/28 or
`ECDSA` rejects an otherwise valid signature, and a wallet that refuses one method needing the other.

So the contract is: you implement two methods against whatever wallet you have, and the SDK turns
"here is a digest" into "here is a signature the contract will accept". `walletSigner` is that
implementation for an EIP-1193 provider; a hardware wallet, a KMS or a remote signer is your own
object satisfying `Signer`.

## Signing and paying are different decisions

```ts
import {prepareExecution, signAndSubmit} from "@somnia-chain/accounts-sdk";

// The owner's injected wallet signs. The session key pays and broadcasts. The owner never
// needs gas — `execTransaction` checks signatures, not `msg.sender`.
const {hash} = await signAndSubmit(client, {
  prepared: prepareExecution(plan, owner),
  signer,
  sender,
  chain,
});
void hash;
```

Give `signAndSubmit` a signer that cannot pay and no sender, and it raises `SenderRequiredError`
rather than failing at broadcast against the wrong address. `canPay(signer)` is the type guard it
uses.

## Never hand a wallet a nonce

An injected wallet manages its own. **A nonce computed against a different node is how a
transaction ends up stuck behind a gap nobody can see** — nothing fails, it just never mines, and
every later transaction from that address queues behind it.

`submitCall` handles this: an injected wallet goes through `eth_sendTransaction` with **neither a
nonce nor a gas price**, because it fills both itself, while an embedded key — which signs a whole
transaction — gets both read from the chain you are writing to. That is the other half of why `external` matters, and it is why you should not assemble
the transaction yourself unless you are also taking over the nonce question.

## The network check

`WrongNetworkError` carries `expected` and `actual`. It is thrown rather than silently reading the
wrong chain, because a client pinned to mainnet answering questions about testnet is otherwise
indistinguishable from a correct answer.

## Related

- [Errors](../reference/errors.md) — `WalletResponseError` vs `RpcError`
- [How to act without a signature](./act-without-a-signature.md) — when no prompt is needed at all
