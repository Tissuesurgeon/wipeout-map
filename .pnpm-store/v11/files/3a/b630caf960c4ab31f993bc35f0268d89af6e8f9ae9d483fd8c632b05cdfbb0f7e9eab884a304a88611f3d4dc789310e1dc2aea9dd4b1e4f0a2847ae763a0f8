# How to trade through a smart account

This guide shows you how to send writes through a smart account from [`@somnia-chain/accounts-sdk`](https://www.npmjs.com/package/@somnia-chain/accounts-sdk) — a Gnosis-style safe the cross-chain factory deploys at the same address on every chain — so the account, not your key, is the actor every pool sees. It assumes the account already exists and your actor is set up on it; creating accounts, adding a session key as an owner, and finding an account's address are `client.accounts` — the [Smart accounts guide](../ACCOUNTS.md) walks the whole lifecycle.

The smart-account executor described here covers the factory's accounts through the accounts SDK itself: batching without configuration, and accounts owned by other accounts, at any depth. An account that the factory did not deploy needs a custom `Executor`.

## The account is the trader

Build the executor with the account's address and an inner executor that sends the outer transaction. The usual arrangement is a session key added as an owner of the account, so nothing signs — the account honours the sender's presence as its approval.

The session key signs locally, with `{ privateKey }`. Do not use a `{ sessionSeed }` executor as `inner`: it sends the seed to the node on every write, and the seed would then control the account's funds. The SDK refuses it with `InvalidInputError`. Use one sending mode per address, because local and node-side sends share one nonce space:

```ts
const session = client.createExecutor({ privateKey: sessionKey });
const account = client.createExecutor({ smartAccount: ACCOUNT, inner: session });
const trader = client.createTrader({ executor: account });
await trader.placeOrder(params); // approval + order in ONE account transaction, nothing signs
```

Two properties come with this shape:

- **Batching needs no configuration.** Several calls (an approval and the order it enables) become one account transaction through the accounts SDK's own MultiSend batcher, resolved from its committed deployment manifests.
- **The no-signature path reads no nonce.** The account checks the sender against its owner set, never a planned hash, so no nonce is fetched and no wallet is prompted.

For this to hold, `inner`'s actor must be a **direct owner** of the account and the account's threshold must be **1**. Neither is checkable offline; a violation reverts at the account (`GS025` / `GS020`) and surfaces as a `ContractRevertError` tied to the account's `execTransaction`.

Before the first write, the executor reads the account's code on the chain, once. An account that does not exist on that chain yet is refused with `InvalidInputError` before anything is signed or sent. Without this check, a call to the empty address would succeed and execute nothing. Create the account on the chain first (see the [Smart accounts guide](../ACCOUNTS.md)).

## When something must sign

Pass a `signer` when the sending actor's presence is not authority enough — the sender is a relayer or sponsor, or the signing owner is a different key than the one that sends:

```ts
const account = client.createExecutor({
  smartAccount: ACCOUNT,
  inner: session,
  signer: { address: ownerAddress, signTypedData: (typedData) => ownerAccount.signTypedData(typedData) },
});
```

The signer is shown the account's own Safe transaction (EIP-712, chain-bound), signs once per write, and any funded inner actor may send the result.

Each signed write signs the account's current nonce, so the engine runs signed writes through one account one at a time, including writes from two executors built for the same account. The queue belongs to one engine. Two processes that write through the same account (for example a backend and a browser) can still sign the same nonce, and the account then refuses the second write with `GS026`.

## An account owned by another account

`through` names the parent accounts between the signer and the acting account, nearest first. The accounts SDK nests the signature through each parent's EIP-1271 envelope; depth is bounded by gas, not by the SDK:

```ts
const child = client.createExecutor({
  smartAccount: CHILD_ACCOUNT,
  inner: session, // its actor owns MAIN_ACCOUNT and signs through it
  through: [MAIN_ACCOUNT],
});
```

With `through` set, something always signs. When `signer` is omitted, the inner executor's own typed-data signing stands in — its actor must then own the outermost parent. At depth the signer is shown the outermost parent's `SafeMessage` envelope rather than the transaction itself; a wallet can only render the hash, because that is genuinely all there is at that level.

## What the executor covers, and what it does not

- **Covered:** a direct owner at threshold 1 (pre-validated, nothing signs); any topology one owner signature settles, including nested accounts at any depth (signed).
- **Not covered:** an account whose threshold is above 1. Collecting several owners' signatures is a workflow, not an executor — build the call with the accounts SDK's `signExecutionWith` and drive it through a custom `Executor`.
- **Typed-data verbs:** the executor has no `signTypedData` — an account's "signature" is an on-chain arrangement, and `signRedeemAuth` recovers a key. Those verbs throw `SignerRequiredError`; create that trader with a key or wallet executor instead.

## Check the chain

The accounts SDK carries its own deployments (Somnia mainnet 5031, Somnia testnet 50312, Hideki testnet 50383 — the same addresses on each). A smart-account spec on any other chain is refused with `InvalidInputError` at `createExecutor`, before anything is signed or sent.
