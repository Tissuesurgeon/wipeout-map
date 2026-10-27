# Smart accounts

The factory account model of [`@somnia-chain/accounts-sdk`](https://www.npmjs.com/package/@somnia-chain/accounts-sdk), reachable through this SDK alone. A smart account is a Gnosis-style safe the cross-chain factory deploys at the same address on every covered chain (Somnia mainnet 5031, Somnia testnet 50312, Hideki testnet 50383); its address derives from `(accountId, index)` before anything is deployed, an account can own other accounts, and a session key added as an owner trades through it without signing.

Three surfaces, one dependency:

- **`client.createExecutor({ smartAccount, inner })`** — send trades AS an account. The [how-to guide](./how-to/trade-through-a-smart-account.md) covers it.
- **`client.accounts`** — one chain: derive, discover, create, manage owners, move funds, check health.
- **`exchange.accounts`** — every configured chain: the cross-chain scan, one-signature creation on all chains, and the multi-chain account the exchange trades through.

A client used only for accounts needs no indexer: `indexerUrl` is optional, and every indexer read or live watch on such a client throws `NotConfiguredError` naming the field.

## From nothing to trading, in four calls

These four calls act on one chain, so they name it. `exchange.client` is the
same engine on a single-chain exchange, but it throws `InvalidInputError` once
the exchange spans more than one — use `engineFor(chainId)` here.

```ts
const client = exchange.engineFor(chainId);
// The session key signs locally. It never leaves this process.
const session = client.createExecutor({ privateKey: sessionKey });

// 1. One signature authorizes the account, with the session key as a second owner.
const prepared = client.accounts.buildAccountAuthorization({
  accountId: ownerAddress,
  indices: [0n],
  additionalOwners: [session.actor],
});
const authSignature = await ownerWallet.signTypedData(prepared.typedData);

// 2. Anyone funded sends the creation call. Here the session key sends it.
const creation = client.accounts.buildCreateAccounts(prepared.authorization, authSignature);
await session.execute([creation.call], { gas: creation.gas });

// 3. The account is the trader. The session key sends the account's transactions. It signs no Safe transaction.
const account = client.createExecutor({
  smartAccount: client.accounts.addressOf(ownerAddress, 0n),
  inner: session,
});
const trader = client.createTrader({ executor: account });

// 4. Trade.
await trader.placeOrder(params);
```

The authorization's EIP-712 domain deliberately omits the chain id, so the same signature settles on every covered chain — `exchange.accounts.buildCreateAccounts` fans it out into one creation call per covered configured chain.

### Keep the session key in the process

The session key is an owner of an account that holds funds. Whoever holds the key can move those funds on every chain where the account exists. So:

- **Sign locally.** Build the account's `inner` with `createExecutor({ privateKey })`, as above. Do not use `createExecutor({ sessionSeed })` for an owner: that executor sends the seed to the node on every write, and every RPC endpoint, proxy or request log on the way can read it. The SDK refuses such an executor as the `inner` of a smart account, with `InvalidInputError`. Keep node-side session sending for accounts that hold gas dust only.
- **Hold a Somnia session seed?** `exchange.accounts.accountFor(accountId, index, { sessionSeed })` derives the seed's key and signs locally on every chain (see [Multi-chain](#multi-chain-the-facade-surface)). The session address stays the same.
- **Use one sending mode per address.** Local sends and node-side session sends from the same address share one nonce space. If you mix them, the nonce sequence breaks. After an address signs locally, do not send from it through `createExecutor({ sessionSeed })` or `sendSessionTransaction`.

## Discovery: which accounts exist, who controls what

```ts
const scan = await client.accounts.find(ownerAddress); // deployed / empty / unanswered, per index
const owners = await client.accounts.ownersOf(accountAddr); // owners classified key vs account, plus threshold
const custody = await client.accounts.custodyChain(accountAddr); // DOWN to the keys that ultimately control it
const through = await client.accounts.authorityPath(accountAddr, signerAddress); // UP: the executor's `through`, or null
```

`authorityPath` answers the executor's one configuration question: "I hold this key — what do I pass as `through`?" `null` means the signer has no authority over the account, which is an answer, not an error.

A scan can never prove absence — the index space is `uint256` and the factory counts nothing — so `find` reports exactly which indices it checked (`scan.indices`) and three states per slot: deployed, empty, unanswered. Render from those, never from a missing entry; `describeCoverage(scan)` (re-exported) turns the coverage into the honest sentence.

## Indexed reads: history, and whose account an address is

Two questions have no chain read: whose account a bare address is, and what an account has done. The accounts indexer answers both. The accounts SDK knows where its indexers are, so these reads take no URL:

```ts
const found = await client.accounts.getIndexedAccount(someAddress); // null when the factory made nothing there
const children = await client.accounts.listDerivedAccounts(ownerAddress); // every index, every page
const controlled = await client.accounts.listControlledAccounts(ownerAddress); // including accounts it was ADDED to
const history = await client.accounts.listOwnerHistory(accountAddr, { includeFormer: true });
const page = await client.accounts.getActivityPage(accountAddr, { limit: 25 }); // { items, nextCursor }
const more = page.nextCursor && (await client.accounts.getActivityPage(accountAddr, { cursor: page.nextCursor }));
const status = await client.accounts.getIndexerStatus(); // behindBy, lagSeconds, ready: hedge anything stale
const modules = await client.accounts.listModuleHistory(accountAddr, { includeFormer: true });
const terms = await client.accounts.getCreationAuthorization(accountAddr); // null for a plain createAccount
```

Pages are this SDK's own shape, the same as the fills feeds: `{ items, nextCursor }`, `null` when drained. The cursor is opaque and bound to the read and filter that issued it — passed to another read it is refused with `InvalidInputError`.

The network as a whole, for a front page or an explorer:

```ts
const newest = await client.accounts.getAccountsPage({ limit: 20 }); // every account the factory made, newest first
const latest = await client.accounts.getNetworkActivityPage({ kinds: ["Executed"] }); // any account's history
const factory = await client.accounts.getFactoryState(); // admin, implementation, exact accountCount
const changes = await client.accounts.getFactoryHistoryPage(); // upgrades, admin changes, domain changes
```

`found.derivation` says whose account it is (`accountId`, `index`), who paid for it, and whether `accountId` is still an owner. Only accounts `SomniaAccountFactory` made come back: a Safe from another factory is `null` here.

On `exchange.accounts` the same reads span every covered configured chain: `listIndexedAccounts`, `listDerivedAccounts`, `listControlledAccounts`, `listOwnerHistory`, `getActivityPage`, `listIndexerStatus`, `listModuleHistory`, `listCreationAuthorizations`, `listFactoryStates`, `getAccountsPage`, `getNetworkActivityPage` and `getFactoryHistoryPage`. Unlike the markets indexer, one accounts-indexer deployment serves an environment (Somnia testnet and Hideki share one) and every row names its `chainId`. The paged feeds merge chains by time, and each chain resumes from its own position. The same address can be a different account on each chain.

The row types (`IndexedAccount`, `AccountEvent`, `IndexedOwner`, `IndexedModule`, `IndexedAuthorization`, `AccountFactoryState`, …) are the accounts SDK's data shapes, re-exported. The control types — pages, cursors, options and `AccountsIndexerStatus` — are this SDK's own, so a change in the accounts SDK's paging does not reach your code.

To point a chain at another accounts indexer (a local stack), or to turn one off, call the accounts SDK's `configureIndexer({ urls })` once at startup. A chain with no accounts indexer is refused with `NotConfiguredError`; a failed request is `IndexerError`.

## Owner management and funds: the account administers itself

Every write comes back as an `UnsignedCall` for an executor to send. Owner changes and transfers are calls the ACCOUNT executes, so they go through the account's own smart-account executor:

```ts
const owners = await client.accounts.ownersOf(accountAddr);
const add = client.accounts.buildAddOwner(accountAddr, newSessionKey, 1n);
const move = client.accounts.buildTransfer({ to: mainAccount, tokens: [{ token: usd, amount: 1_000_000n }] });
await account.execute([add, ...move]); // one account transaction, batched by the accounts SDK
```

`buildSwapOwner` and `buildRemoveOwner` take the CURRENT owner list (from `ownersOf`) — Safe's owner list is linked, and the call names the predecessor.

## Sponsorship: sign now, send later

When the signer and the payer are different processes — the user signs in the browser, your backend broadcasts and pays — the executor path does not fit (an executor signs AND sends). `buildExecution` splits them:

```ts
const prepared = await client.accounts.buildExecution({
  account: accountAddr,
  calls: client.accounts.buildTransfer({ to: recipient, native: amountWei }),
  signer: ownerAddress,
});
const signature = await ownerWallet.signTypedData(prepared.typedData);
const finished = prepared.toCall(signature); // hand this to your backend
```

`finished` is an `UnsignedCall` any funded key may broadcast (the signature carries the authority). Send it with at least `prepared.gasFloor` gas and assert the receipt's `status` yourself — a hand-rolled send has no writer to do it. `through` works here the same way it does on the executor.

Two details for particular signers: pass `nonce` when you already know it — `nonce: 0n` prepares an undeployed account's FIRST action, signed before the account exists, with no read at all. And a signer that signs the `digest` via `personal_sign`/`eth_sign` instead of typed data must add `4` to the signature's final `v` byte — Safe's marker for an eth_sign signature; without it the recovered address is real and wrong.

## Health

```ts
const report = await client.accounts.health(accountAddr);
```

Evaluates the account's setup against the factory's canonical shape — singleton, fallback handler, owners, threshold, modules — each finding with a severity. A finding is not necessarily a problem; it is a deviation worth a look.

## Multi-chain: the facade surface

```ts
const everywhere = await exchange.accounts.scan(ownerAddress); // every covered configured chain at once
const multi = exchange.accounts.accountFor(ownerAddress, 0n, { sessionSeed });
const spanning = new SomniaMarkets({ chains, account: multi }); // the exchange trades through it on every chain
```

`accountFor` builds the `{ address, executors }` account the exchange config takes: the derived address (identical on every covered chain) plus a smart-account executor per covered configured chain. On each chain a local signer drives the account. `accountFor` derives it from the seed's key (`sessionPrivateKey(seed)`) and binds it to that chain's nonce lane, so no request carries the seed. The same seed derives the same session address everywhere, so one key owns the account on every chain. A configured chain the accounts SDK does not cover gets no executor and is skipped, never silently substituted.

Do not also send node-side from the seed you give to `accountFor` (`createExecutor({ sessionSeed })`, `sendSessionTransaction`): both modes share one nonce space. A per-chain factory in place of `{ sessionSeed }` must not return a `createExecutor({ sessionSeed })` executor either. `accountFor` refuses it with `InvalidInputError`.

Funds reach a market's chain the same way trades do: `exchange.bridge` plans and executes Hyperlane transfers through the same per-chain executors, so a smart account's approval and bridge call land as one account transaction — see [Bridge](./BRIDGE.md).

## Errors

Everything here throws this SDK's own classes: an input the accounts SDK refuses (including a chain it has no deployment for) is `InvalidInputError`; a transport failure is `RpcError` with the original as `cause`. The indexed reads add `NotConfiguredError` (no accounts indexer for the chain), `IndexerError` (the request failed, the chain on it when there is one), `AccountsIndexerUnavailableError` (the accounts indexer is rate-limited or overloaded — wait `retryAfterMs` and retry; a subclass of `IndexerError`) and `AccountFeedRestartRequiredError` (the chain's accounts index was rebuilt under a feed cursor — restart without it). A revert while sending THROUGH an account surfaces as `ContractRevertError` tied to the account's `execTransaction`, with the actual cause named where a replay can decode it — the account's own `GS` code as a sentence, or the inner call's real revert, including this SDK's contract errors.

## What stays outside

- Signature collection for accounts above threshold 1: a workflow, not an executor — the accounts SDK's `signExecutionWith` builds the call, a custom `Executor` sends it.
- The accounts SDK's own submission helpers (`submitCall`, relaying) — this SDK's transport is the better send path, which is the accounts SDK's own recommendation.
- Per-write payer choice: an executor's payer is fixed in its `inner`. A UI that picks the payer per write builds one executor per candidate and chooses by balance (`client.getNativeBalance`).
