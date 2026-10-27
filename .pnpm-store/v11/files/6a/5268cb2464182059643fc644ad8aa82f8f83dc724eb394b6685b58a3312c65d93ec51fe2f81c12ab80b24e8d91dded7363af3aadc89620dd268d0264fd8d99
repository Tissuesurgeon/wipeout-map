# Gas

Limits, floors and the one measurement helper. This page is a reference: it states the numbers and
where they came from, without telling you what to do.

If you read nothing else: **gas for these calls cannot be estimated, and the failure when you try
is silent.** The send succeeds, the hash is real, the receipt says failure, and nothing happened.

## Why `eth_estimateGas` does not work here

Safe's `setup()` and `execTransaction()` run **nested** — inside the factory's frame, or inside the
account's. EIP-150's 63/64 rule hands a nested call a fraction of the gas that _remains_ at that
point, rather than everything left in the transaction.

So these calls need a floor of gas **remaining**. `eth_estimateGas` measures gas **spent**. No
multiplier on the latter reliably clears the former.

The measured case, on Somnia testnet (50312):

| Limit sent | Gas burnt | Outcome      |
| ---------- | --------- | ------------ |
| 3,000,000  | 2,908,286 | **reverted** |
| 20,000,000 | 2,774,511 | succeeded    |

The successful run spent _less_ than the failed one. An estimate taken from either tells you
nothing about which limit works.

**Sending a large limit costs nothing extra.** The chain refunds what is not burnt. What a large
limit costs is the prefund the sender must hold while the transaction is in flight — and the block
gas limit, which is a hard ceiling no matter who pays.

## Constants

| Name                       | Value         | What it is for                                       |
| -------------------------- | ------------- | ---------------------------------------------------- |
| `CREATE_ACCOUNT_GAS_LIMIT` | `20_000_000n` | One account creation. About 4.9x the measured floor. |
| `CREATE_ACCOUNT_GAS_STEP`  | `4_200_000n`  | What each account after the first adds.              |
| `EXECUTION_GAS_FLOOR`      | `2_000_000n`  | The least an `execTransaction` is sent with.         |

`CREATE_ACCOUNT_GAS_LIMIT` is the limit for **one** account. Bisected with `eth_call` against the
live factory, the floors are:

| call                      | floor     |
| ------------------------- | --------- |
| `createAccount`           | 3,668,090 |
| `createAccountWithOwners` | 4,146,788 |

The second was 4,115,905 before the batch implementation — `issuedAt` is one more word in the
digest, so the floor moved up. `packages/sdk/test/gas-floor.live.test.ts` re-measures both on
demand, which is the only thing that keeps these numbers honest.

`CREATE_ACCOUNT_GAS_STEP` is derived from that same floor, rounded up. One more account costs about
one account: the batch is a loop over independent CREATE3 deployments, each with its own nested
`setup`, so the curve is a small fixed part plus one account's worth per index.

`EXECUTION_GAS_FLOOR` exists because a nested execution pays for an EIP-1271 staticcall per level,
and Safe re-reads storage that an estimate saw warm. On Somnia, where blocks are a second apart, the
state an estimate measured against is routinely not the state it mines into.

## `createAccountsGasLimit(count)`

The limit a `createAccountWithOwners` batch needs.

<!-- docexample: run -->

```ts
import {
  createAccountsGasLimit,
  CREATE_ACCOUNT_GAS_LIMIT,
  CREATE_ACCOUNT_GAS_STEP,
} from "@somnia-chain/accounts-sdk";

createAccountsGasLimit(1); // => 20_000_000n
createAccountsGasLimit(4); // => CREATE_ACCOUNT_GAS_LIMIT + 3n * CREATE_ACCOUNT_GAS_STEP
CREATE_ACCOUNT_GAS_LIMIT; // => 20_000_000n
CREATE_ACCOUNT_GAS_STEP; // => 4_200_000n
```

`count` is **how many indices the authorization names**, including any index that turns out to be
taken already. An account that already exists is skipped — a code-size check and an event — and four
skips plus one create measure about the same as one create alone. So nobody has to know offline
which indices are free.

Throws `InvalidInputError` when `count` is not a positive integer. Zero is `NoIndices` on chain.

A batch sent with the single-account limit runs out partway through, and that failure is the quiet
kind: the send succeeds, the hash is real, and the receipt says nothing was created.

## `measureGas(client, {call, payer, floor})`

An estimate, padded and floored. This is the same policy `signAndSubmit` applies internally, and it
is exported because a copy of it drifts.

```ts
import {measureGas} from "@somnia-chain/accounts-sdk";

const gas = await measureGas(client, {call, payer: sender.address, floor: prepared.gasFloor});
void gas;
```

- The estimate is padded by **a fifth** (`measured * 12n / 10n`).
- If `floor` is given and the padded value is below it, `floor` wins.
- **`payer` matters.** Estimating from an address that cannot afford the call fails with an
  insufficient-funds error that reads as though the call itself is broken. Omit `payer` for a
  relayer, which has no address to offer and is expected to have its own policy; the estimate is
  then taken with no `from`, padded and floored the same way.
- An estimate that reverts is thrown, not padded. A revert at estimation time is a real failure and
  padding it would produce a number that reverts anyway.

It is a function rather than a method on `Prepared` because a prepared call does not know who will
pay for it — the sender is chosen at submit time — so `prepared.measureGas(client)` would have to
estimate from nobody and quietly give a worse answer.

## `Prepared.gasFloor` and `Prepared.gas`

Two different things, and the distinction is load-bearing:

- **`gas`** replaces measurement entirely. The flow knows the limit.
- **`gasFloor`** keeps measurement — so a large batch still gets what it needs — while refusing to go
  below a level the flow knows is unsafe.

`prepareExecution` sets `gasFloor` to `EXECUTION_GAS_FLOOR`. `prepareAccountCreation` sets `gas`,
because creation is the case where the measurement is known to be useless.

## Can the payer afford it

```ts
import {canPayFor, pickPayer} from "@somnia-chain/accounts-sdk";

const {affordable, balance, required, gasPrice} = await canPayFor(client, {
  address: sender.address,
  gas: 20_000_000n,
});
void [affordable, balance, required, gasPrice];

// `payer` is the first affordable candidate; `checked` carries EVERY candidate's numbers.
const {payer, checked} = await pickPayer(
  client,
  [owner, sessionKey].map((address) => ({address})),
  {
    gas: 20_000_000n,
  },
);
for (const row of checked) {
  row.candidate; // the object you passed in, so you can carry your own fields through
  row.balance;
  row.required;
}
void payer;
```

`pickPayer` returns `payer: null` when none of them can, together with what each one was checked
against — so a UI can say _which_ balance was short and by how much, rather than "insufficient
funds".

**It reads every candidate rather than stopping at the first success**, concurrently. That is
deliberate: the answer a caller usually wants next is _why not_, and `checked` is what distinguishes
"nobody can pay" from "nobody has been asked yet". Rendering those two the same way is how a UI
tells someone their funded wallet is broke while the balance is still loading.

`pickPayer` is generic over your own candidate type, so `checked[].candidate` hands back the object
you passed in — attach a label or a wallet handle and it survives the round trip.

**Both ask the chain for the gas price rather than assuming one**, and that is the difference
between a usable check and a useless one. A constant has to be generous to be safe: an earlier
version required twenty million gas at twenty gwei — 0.4 of the native token — to green-light a
create that actually costs a small fraction of that, so someone holding a tenth of a token, which is
plenty, was told no key could pay.

`required` is therefore `gas × the live price` plus any `value`, not a fixed figure.

`canPay(signer)` is unrelated to balances: it is a type guard for whether a `Signer` is also a
wallet that can send, which is how `signAndSubmit` decides whether the signer can double as the
sender. A signer that cannot raises `SenderRequiredError`.

## Relaying

A relayer gets the limit as a hint, and **should use it**:

```ts
import {submitCall, type Relay} from "@somnia-chain/accounts-sdk";

const sponsor: Relay = {
  async send(bytes, id, hints) {
    // `hints.gas` is what the SDK already worked out. A relayer that hardcodes something
    // reasonable-looking instead fails every account creation with an out-of-gas receipt.
    const response = await fetch("https://sponsor.example/send", {
      method: "POST",
      body: JSON.stringify({
        to: bytes.to,
        data: bytes.data,
        chainId: id,
        gas: String(hints?.gas ?? 20_000_000n),
      }),
    });
    const {hash} = (await response.json()) as {hash: `0x${string}`};
    return hash;
  },
};
await submitCall(client, {chain, sender: sponsor, call, gas: 20_000_000n});
```

The third argument is optional so a two-argument `send` still satisfies the interface — it just
guesses, and 2,500,000 is a natural guess that silently fails every creation.

## Related

- [How to sponsor a transaction](../how-to/sponsor-a-transaction.md)
- [Errors](./errors.md) — `CannotPayError`, `UnconfirmedSendError`, `TransactionRevertedError`
