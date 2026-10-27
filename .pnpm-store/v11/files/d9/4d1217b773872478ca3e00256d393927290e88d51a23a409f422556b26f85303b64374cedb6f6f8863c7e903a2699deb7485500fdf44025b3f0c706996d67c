# Native RPC

Somnia's node serves a `somnia_*` namespace alongside the usual `eth_*`. It exposes
things the Ethereum-compatible surface has no field for — the native ledger block,
chain statistics, reactivity subscription reads — plus **session transactions**,
where the node holds the key, tracks the nonce, signs, retries, and hands back the
receipt, so a client can transact with no signer at all.

This module wraps exactly the twelve methods in the
[public JSON-RPC reference](https://docs.somnia.network/developer/json-rpc-api)
(as ten TypeScript methods: the by-hash and by-number block and receipt reads,
and the two `isReady` variants, fold together), and
nothing else — see [Not wrapped](#not-wrapped).

```ts
import { createPublicClient, http } from "viem";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { createNative } from "@somnia-chain/markets-sdk/native";

const client = createPublicClient({ chain: somniaShannon, transport: http() });
const native = createNative(client);

const block = await native.getBlock("latest");
console.log(block?.consensusBlock.proposerAddress, block?.executionBlock.executionGasUsed);
```

`createNative` takes anything with an EIP-1193 `.request` — a viem client, the markets
client's (`createNative(exchange.client.getViemClient())`), or an injected wallet
provider. It needs nothing else from the SDK.

## Why a wrapper

Because these endpoints are easy to call wrong, and the node's reply when you do is a
bare `-32602 invalid parameters` that tells you nothing. Two shapes surprise everyone,
both confirmed against a live node:

| You'd write                             | The node wants                                              |
| --------------------------------------- | ----------------------------------------------------------- |
| `params: [1]`                           | `params: ["0x1"]` — block numbers are hex **strings**       |
| `params: [[1, 2]]` for subscription ids | `params: ["0x1", "0x2"]` — the ids **are** the params array |

And what comes back is the node's C++ member names verbatim, with no case
conversion — so blocks are `snake_case` (`consensus_block.block_number`) while
statistics are `camelCase` (`numSuccessfulTransactions`), purely because that is how
the two structs happen to be written. Quantities are hex strings.

This module takes `bigint`s and tags, hex-encodes them correctly, and decodes the
replies into one consistent camelCase surface with `bigint` quantities. Receipts go
through viem's own `formatTransactionReceipt`, so a session receipt is the same
`TransactionReceipt` the rest of your code already handles. A session receipt also
carries `executionTimeMicros` (a `number`) when the node reports it: the node-side time
from request to answer. The untouched wire shapes are exported as `Rpc*` types if you
want them.

### Read the node's message, not viem's

Somnia reports mempool rejections as JSON-RPC **`-32000`**, with the useful text in
`message` and a `MempoolStatusCode` byte in `data`. viem maps `-32000` to its
`InvalidInputRpcError`, whose display text is the generic **"Missing or invalid
parameters."** So the obvious thing to log claims your parameters are wrong when the
real problem is an unfunded account:

```
error.message   "Missing or invalid parameters. Double check you have provided…"
error.details   "account does not exist"          ← what the node actually said
```

`getSomniaRpcError` recovers it, and decodes the status byte:

```ts
import { getSomniaRpcError, SomniaMempoolStatus } from "@somnia-chain/markets-sdk/native";

try {
  await native.sendSessionTransaction({ seed, gas: 21_000n, to, value });
} catch (error) {
  const rpc = getSomniaRpcError(error);
  console.error(rpc?.message); // "account does not exist"
  if (rpc?.mempoolStatus === SomniaMempoolStatus.nonceTooSmall) retryWithFreshNonce();
}
```

Branch on `mempoolStatus` rather than matching message text — `nonceTooSmall` is
retryable, `insufficientBalance` needs funding, and `accountDoesNotExist` means the
_sender_ has never existed, which is a third fix. The codes come from
`MempoolStatusCode` in the node source, so the set is complete rather than the three
we happened to trip over.

**Nothing needs bypassing.** viem preserves the original: `BaseError`'s constructor
inherits `details` from a `BaseError` cause, so the node's text propagates up the whole
wrapper chain from the `RpcRequestError` that set it, and the raw
`{ code, message, data }` object is still the innermost `cause`. `getSomniaRpcError`
walks to it structurally — no `instanceof` against viem's classes, so it also works on
an error from a plain `fetch`-based requester that never went through viem.

This cost real time during live testing: a correctly-encoded session send read as a
parameter error until the raw HTTP body showed `account does not exist`.

## Reads

```ts
await native.isReady(); // false while syncing
await native.getBlock("latest"); // tag, number, or 32-byte hash
await native.getStatistics(blockNumber - 100n, "latest"); // aggregate activity
await native.listPrivilegedReceipts("latest"); // protocol-issued txs (usually none)
await native.listReactivitySubscriptionIds(owner); // → bigint[]
await native.getReactivitySubscription(1n); // → one, or null
await native.listReactivitySubscriptions([1n, 2n]); // → many, one round-trip
await native.getNodePublicKeys(); // address + 2 keys + 2 proofs
```

`getBlock` and `listPrivilegedReceipts` accept a tag (`"latest"`, `"earliest"`,
`"pending"`, `"safe"`, `"finalized"`), a block number, **or** a 32-byte hash — a
32-byte hex value dispatches to the by-hash RPC, anything shorter is a number.

A **ledger block** is not the Ethereum block: it pairs the consensus half (proposer,
timing, the data-chain blocks it commits) with the execution half (gas, receipts hash,
state snapshot). Note `consensusBlock.timestamp` is unix **milliseconds** — Somnia
blocks are ~100 ms apart, so seconds would be useless.

`getNodePublicKeys` returns all five fields the node publishes: the address, the
secp256k1 and BLS public keys, and the two proofs that bind them together (a BLS
proof of possession and a proof of address). The proofs are what make the rest
meaningful, so they are not dropped.

## Session transactions

A session is a **32-byte seed**. The node turns it into a key pair, assigns the nonce,
signs, submits, retries transient failures, and returns the receipt — one call instead
of sign + send + poll. Useful when a client shouldn't hold a key at all: load
generators, bots, game backends.

```ts
import { createNative, sessionAddress } from "@somnia-chain/markets-sdk/native";

const seed = "0x…"; // 32 bytes, and a SECRET — see below

// Where to send funds. Derived locally: no RPC, no node involved.
const from = sessionAddress(seed);

const receipt = await native.sendSessionTransaction({
  seed,
  gas: 21_000n, // enough ONLY if `to` already exists — see gas, below
  to: recipient,
  value: parseEther("0.1"),
});
console.log(receipt.status, receipt.transactionHash);
```

Six things to know before using it:

- **The seed is a private key in another shape.** The derivation is public and
  deterministic — `sessionPrivateKey(seed)` computes the very key the node uses. Anyone
  who learns a seed can drain its account without touching the node. Guard it as a key.
  A failed call does not hand it back: `sendSessionTransaction` and `getSessionAddress`
  throw an `RpcError` instead of viem's error, whose message would print the request
  body — seed included. When the node answered, `cause` is its own
  `{ code, message, data? }` and `getSomniaRpcError` reads it as before; when the
  transport failed first, `cause` is `{ name, message, status? }` with the request text
  kept and the seed blanked out.
- **Give a node-side session account gas dust only.** `sendSessionTransaction` puts the
  seed on the wire with every call, so any RPC endpoint, proxy or request log on the way
  can read it. Never make a node-side session address an owner of an account that holds
  funds. For that, sign locally: `createExecutor({ privateKey: sessionPrivateKey(seed) })`,
  or `exchange.accounts.accountFor(accountId, index, { sessionSeed })` across chains. The
  SDK refuses a `createExecutor({ sessionSeed })` executor as the `inner` of a smart
  account.
- **Pre-fund the account.** Use `sessionAddress(seed)`; an unfunded session cannot pay
  gas. `native.getSessionAddress(seed)` asks the node the same question if you want
  confirmation (the two are asserted equal by the live test suite). Note the node
  rejects a send from an account that has never existed with `account does not exist`
  (mempool code `0x02`), not with an out-of-gas.
- **Paying a brand-new address costs ~30× the Ethereum figure.** Somnia has to bring
  the account into existence, and `21_000` is not enough: the transaction **reverts
  with `status: "reverted"` having consumed the entire limit**, and the recipient is
  not credited. Measured on Hideki, first payment to a fresh address:

  | gas limit  | outcome                          | gasUsed             |
  | ---------- | -------------------------------- | ------------------- |
  | `21_000n`  | reverted, recipient not credited | 21,000 (all of it)  |
  | `100_000n` | reverted, recipient not credited | 100,000 (all of it) |
  | `700_000n` | success                          | 421,000             |

  `eth_estimateGas` quotes ~631,500 for such a transfer. A second payment to the same
  address costs the ordinary 21,000. Since the node does not estimate for you, budget
  by whether the recipient already exists — and treat a `reverted` receipt whose
  `gasUsed` equals the limit as "the limit was the problem".

- **The nonce space is shared** with `eth_sendRawTransaction` from the same address.
  Sending both ways at once corrupts the sequence — pick one per account. An address that
  signs locally (through `accountFor` or `sessionPrivateKey`) must not also send here.
- **It blocks until the receipt exists.** The node retries with backoff, so a call can
  take a while; give the transport a generous timeout. There is no fire-and-forget
  variant. Omit `to` to deploy a contract, with `data` as the init code.

The send goes out with transport retries **disabled** (`retryCount: 0`). viem retries a
failed request three times by default, and the node's failures (a node-side ceiling, a
full mempool) look retryable — so a default retry could submit the same transfer again
under a fresh nonce. One attempt; the node already retries internally where that is
safe. A missing receipt **throws** rather than resolving to `null`: a receipt is the
whole contract of the call.

Sessions live in the serving node's memory: they are not shared between nodes, and are
rebuilt from the seed after a restart. Nothing is persisted, and the derived key is
never written to disk.

### Deriving locally

```ts
sessionAddress(seed); // the address, offline
sessionPrivateKey(seed); // the key itself — sign locally instead of trusting the node
```

The algorithm is `keccak256(seed ‖ uint64_le(i))` for `i = 0, 1, 2, …`, taking the
first candidate inside `[1, n-1]`. In practice `i = 0` always wins: a keccak output
falls outside the curve order with probability under 2^-128. This is pinned against
the node for four different seeds in `test/native.e2e.test.ts` — if Somnia ever changed
its derivation, every funded session address would move, and that test is what would
catch it.

## Not wrapped

The wrapped set is the [public JSON-RPC reference](https://docs.somnia.network/developer/json-rpc-api).
A node build serves more than that, but an undocumented endpoint is not part of the
contract — it can change shape or vanish between node versions, and one of them is
outright hazardous. All of them stay reachable via `native.request(...)`, which is the
point: stepping off the documented surface should be a decision, not an accident.

**`somnia_getStorageDatabaseEntries` — undocumented and dangerous.** Its handler
loops over the caller's key list with no cap on the number of keys and no bound on the
size of each value returned, so one request can make a node dump unbounded data. **A
256-key request took the public Shannon testnet down on 2026-07-31** (discovered by
this SDK's own live testing). It is also not what the name suggests to an Ethereum
developer: keys are node-internal `StorageKeyType` discriminants — one byte, or one
byte plus a 32-byte body, where byte 0 must be a member of that enum — not contract
storage slots. For those, `eth_getStorageAt` is the method you want. A malformed key
is an **error**, not a miss.

**`somnia_getProtocolParameters` — undocumented.** The key set is node-version
dependent and its values are plain JSON numbers rather than hex quantities, so
wrapping it would mean publishing a shape that cannot be kept stable. Reach it with
`native.request("somnia_getProtocolParameters", ["latest"])` if you need it; that is
how the account-creation gas figure below was read.

**Operator-only** (`kProtected` on the node) — a public endpoint answers
`{ code: -1, message: "unauthorized" }`, which `isUnauthorized(error)` recognises **by
message**, not by code. That matters: `-1` is the node's default error code, shared with
`invalid range`, `could not load statistics` and `Block does not exist` (all confirmed
live), so keying on the code would report a bad block range as an auth failure. The
methods:
`somnia_connectToPeer`, `somnia_dumpMemory`, `somnia_createTransactionLog`,
`somnia_byteStringBenchmark`. If you _are_ the operator, reach them with
`native.request("somnia_dumpMemory")`.

**Validator plumbing** — `somnia_submitBatchedTransaction` and
`somnia_submitMerkleBatchSignature` carry smash-encoded consensus structs a JS caller
can't construct. Not exposed.

**`eth_sendRawTransactionSync`** (EIP-7966; Somnia's older name for it is
`realtime_sendRawTransaction`) is not a `somnia_*` method, and it is already the SDK's
write path: a local-signer write sends through it and gets its receipt in one
round-trip (see the [engine guide](./ENGINE.md)). No need to call it yourself.

## Nodes that don't have these

Every method here is node-version dependent, and a stock geth or a local anvil has
none of them. Degrade instead of breaking:

```ts
import { isMethodNotFound } from "@somnia-chain/markets-sdk/native";

const stats = await native.getStatistics("earliest", "latest").catch((e) => {
  if (isMethodNotFound(e)) return null; // not a Somnia node — hide the panel
  throw e;
});
```

Everything else throws: a failed read never resolves to `null`. `null` appears in
exactly two places, both genuine by-id misses — an unknown block and an unknown
subscription id.

`isReady()` returns a boolean. `isReady({ withErrorCode: true })` calls the node's
error-code variant, which **throws** on a not-ready node instead of returning `false`
(that is the point of the variant — a health check keys on the error), so it never
returns `false`.

## Where these come from

The method list is `somnia/api/handlers/somnia_api_handlers.h` in
[somnia-chain/somnia2](https://github.com/somnia-chain/somnia2), and session
transactions are specified in its `docs/session_transactions.md`. Both were read —
and then every endpoint was called against a live Shannon node, because the wire and
the C++ types disagree in ways that matter (the field-name inconsistency above, and
`token()`-style traps like a params array that is not what the signature suggests).
`test/native.test.ts` pins the encodings offline against captured payloads;
`test/native.e2e.test.ts` re-checks them against a real node:

```sh
SOMNIA_E2E_NATIVE=1 pnpm test
```
