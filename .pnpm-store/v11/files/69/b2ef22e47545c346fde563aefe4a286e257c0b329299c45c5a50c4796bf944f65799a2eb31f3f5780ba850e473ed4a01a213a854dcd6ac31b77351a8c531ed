# Tutorial: create your first account

By the end of this you will have derived an account address offline, created the account on Somnia
testnet, granted a second key authority over it, and read the result back off the chain.

**You need:** Node 22 or later, and a testnet key with a little STT from the
[Somnia faucet](https://testnet.somnia.network/). About 15 minutes.

Every code block on this page is compiled against the published API by this repository's CI. It has
not been executed for you — the addresses and hashes you see will be your own.

## 1. Install

```sh
mkdir first-account && cd first-account
npm init -y && npm pkg set type=module
npm add @somnia-chain/accounts-sdk viem
```

`viem` is a peer dependency: the SDK takes the client you already have rather than making one.

## 2. The address, before anything exists

Create `derive.ts`:

```ts
import {accountAddress} from "@somnia-chain/accounts-sdk";
import {privateKeyToAccount} from "viem/accounts";

const ownerKey = privateKeyToAccount(process.env.OWNER_KEY as `0x${string}`);
const owner = ownerKey.address;

// No client. No RPC. No account yet.
const account = accountAddress(50312, owner, 0n);
console.log(`owner   ${owner}`);
console.log(`account ${account}`);
```

`owner` and `account` carry through the rest of this tutorial.

Run it with your key in the environment. **It printed an address without touching the network.**

That address is a fact about the key, not about the chain: `keccak256(abi.encode(accountId, index))`
as a CREATE3 salt under a factory that sits at the same address on Somnia mainnet, Somnia testnet
and Hideki. So the same key gives you the same account address on all three, and funds can arrive
there before the account exists.

Change the `0n` to `1n` and you get a different address — that is a sub-account. Index `0` is
conventionally _the_ account for a key.

## 3. Is it there?

```ts
import {accountsOf} from "@somnia-chain/accounts-sdk";
import {createPublicClient, http} from "viem";
import {somniaTestnet} from "viem/chains";

const client = createPublicClient({chain: somniaTestnet, transport: http()});
const scan = await accountsOf(client, 50312, owner);

for (const slot of scan.slots) {
  console.log(slot.index, slot.address, slot.deployed);
}
```

`deployed` is `true`, `false`, or **`undefined`** — and the third is not the second. `false` means
the address is empty; `undefined` means the read did not answer. Treating them alike is how a UI
shows a funded account as empty.

Right now everything should be `false`.

## 4. Create it, and grant a second key, with one signature

You could create the account and then grant the key in two transactions. Do not: that leaves a
window where the account exists without its second key, and it costs one signature _per chain_
because Safe's EIP-712 domain contains the chain id.

Instead, sign one authorization whose domain has no chain id at all:

```ts
import {
  buildAccountAuthorization,
  createAccountsGasLimit,
  prepareAccountCreation,
  signWith,
  submitCall,
  walletSigner,
} from "@somnia-chain/accounts-sdk";

const authorization = buildAccountAuthorization({
  chainId: 50312, // only used to find the factory
  accountId: owner,
  indices: [0n], // just the main account, for now
  additionalOwners: [sessionKey], // the key that will act unattended
  now: BigInt(Math.floor(Date.now() / 1000)),
});

const creation = prepareAccountCreation({authorization, chainId: 50312});
const sig = await signWith(signer, creation);

const {hash, receipt} = await submitCall(client, {
  chain,
  sender, // the session key pays; the owner key never needs gas
  call: creation.toCall(sig),
  gas: createAccountsGasLimit(1),
  describe: "The create transaction",
});
console.log(receipt.status, hash);
```

Three things worth noticing:

- **The owner key signed and paid nothing.** The session key sent the transaction.
  `execTransaction` and the factory both check signatures rather than `msg.sender`.
- **The gas limit is a constant, not an estimate.** Safe's `setup()` runs nested, so it needs a
  floor of gas _remaining_ while `eth_estimateGas` measures gas _spent_. Sending 3,000,000 reverts
  after burning 2,908,286; sending 20,000,000 succeeds on 2,774,511. Unspent gas is refunded.
- **`submitCall` asserted `receipt.status` for you.** An out-of-gas revert produces a real hash and
  no account, so a script that printed an address would prove nothing.

## 5. Read it back

```ts
import {ownersOf} from "@somnia-chain/accounts-sdk";

const set = await ownersOf(client, account);
console.log("threshold", set.threshold);
for (const o of set.owners) console.log(o.kind, o.address);
```

You should see **two owners at threshold 1**: your owner key and your session key. `kind` is `"key"`
for both — it would say `"account"` if an owner were itself a Safe, which is the sub-account model.

**Threshold 1 with two owners means the session key can do everything the owner can, including
removing it.** There is no threshold that grants partial authority. That is the trade you just made,
deliberately: it is what lets the key act without prompting anybody.

## 6. Act, with no signature at all

The session key owns the account _and_ pays for transactions. So it does not need to sign anything —
Safe accepts a pre-validated signature when `msg.sender` is the owner:

```ts
import {
  prevalidatedExecution,
  readExecutionPlan,
  submitCall,
  EXECUTION_GAS_FLOOR,
  nativeTransferCall,
} from "@somnia-chain/accounts-sdk";

const plan = await readExecutionPlan(client, {
  chainId: 50312,
  account,
  calls: [nativeTransferCall(owner, 1n)], // send 1 wei back to yourself
});

const {receipt} = await submitCall(client, {
  chain,
  sender, // the session key: owner AND payer
  call: prevalidatedExecution(plan, sender.address),
  gas: EXECUTION_GAS_FLOOR,
});
console.log(receipt.status);
```

(The account needs a wei to send, so fund it first if this reverts.)

No `signWith`. No prompt. No wallet round-trip. **The call that came back is valid from that address
and no other** — sent by anyone else it is `GS025`, which is why it carries its sender and why
`submitCall` checks it before broadcasting.

## What you built

```
owner key ──signs once──> authorization (no chainId in the domain)
                              │
session key ──pays──────>  createAccountWithOwners
                              │
                              v
                    account at a derived address
                    owners [owner, session], threshold 1
                              │
session key ──sends, signs nothing──> every transaction after that
```

## Next

- [Act from a sub-account](./act-from-a-sub-account.md) — the same account, one level down
- [How to create accounts on every chain](../how-to/create-accounts-on-every-chain.md) — reuse that
  one signature on mainnet and Hideki
- [Gas](../reference/gas.md) — why the limits are constants
