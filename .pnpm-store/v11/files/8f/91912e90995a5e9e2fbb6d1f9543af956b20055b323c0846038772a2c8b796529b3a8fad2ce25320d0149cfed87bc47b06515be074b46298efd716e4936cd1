import { type Address, type Client, type Hex } from "viem";
import type { Call } from "./call.js";
/**
 *  The gas limit `createAccount` needs, which is far above what it charges.
 *
 *  MEASURED on Somnia testnet (50312), 2026-09-02:
 *
 *  | limit sent | outcome            | gas used  |
 *  | ---------- | ------------------ | --------- |
 *  | 3,000,000  | **reverted**       | 2,908,286 |
 *  | 20,000,000 | succeeded          | 2,774,511 |
 *
 *  Note the failing run burnt MORE than the succeeding one, and that `cast estimate` returns
 *  a value above the measured floor of ~3,668,090, and it IS a usable limit. That is not a rounding
 *  problem, it is the 63/64 rule: Safe's `setup()` runs nested inside the factory's frame, so it
 *  is handed 63/64 of what remains at that point rather than everything left in the transaction,
 *  and it needs a floor of gas REMAINING rather than a budget of gas spent. An estimate measures
 *  spend, so it cannot see the requirement, and multiplying it by a small factor does not
 *  reliably clear it either.
 *
 *  Sending this costs nothing extra: the chain refunds what is not burnt. What it costs is the
 *  prefund the sender must hold while the transaction is in flight.
 *
 *  **Assert `receipt.status` regardless.** An out-of-gas revert on Somnia is quiet — the send
 *  succeeds, the hash is real, the account is not there. A script that printed an address proves
 *  nothing.
 *
 *  This is the limit for ONE account. `createAccountWithOwners` creates as many as its
 *  authorization names — see {@link createAccountsGasLimit}, which starts here and adds a step per
 *  further account.
 */
export declare const CREATE_ACCOUNT_GAS_LIMIT = 20000000n;
/**
 *  What each account after the first adds to that limit.
 *
 *  **One more account costs about one account.** The batch is a loop over independent CREATE3
 *  deployments, each with its own nested `setup`, so the curve is a small fixed part plus one
 *  account's worth per index — measured as such in `smart-contracts/test/BatchGas.t.sol`, where
 *  sixteen accounts cost a little over sixteen times one. That test runs under revm, which
 *  underprices Somnia's storage badly, so its shape is quoted and its numbers are not.
 *
 *  The figure itself comes from the same live measurement {@link CREATE_ACCOUNT_GAS_LIMIT} rests
 *  on: the floor for a single `createAccountWithOwners`, bisected with `eth_call` on Somnia
 *  testnet (50312) against the V3 implementation, is 4,146,788 — rounded up here. Using the floor
 *  rather than the spend keeps
 *  every account in the batch as generously funded as the first one, which is the whole posture of
 *  the base constant.
 */
export declare const CREATE_ACCOUNT_GAS_STEP = 4200000n;
/**
 *  The gas limit a `createAccountWithOwners` batch needs, which is not a thing that can be
 *  estimated.
 *
 *  **Why not `eth_estimateGas`.** Safe's `setup()` runs nested inside the factory's frame, so the
 *  63/64 rule hands it a fraction of what REMAINS at that point rather than everything left in the
 *  transaction: it needs a floor of gas remaining, an estimate measures gas spent, and no
 *  multiplier on the latter reliably clears the former. See {@link CREATE_ACCOUNT_GAS_LIMIT},
 *  where sending 3,000,000 reverted after burning 2,908,286 while 20,000,000 succeeded on
 *  2,774,511.
 *
 *  **Why it is a function now.** One authorization creates as many accounts as it names, and each
 *  one is a proxy deployment and a nested `setup`. So the base — 20,000,000, about 4.9x the
 *  measured floor of 4,146,788 for a single one — buys headroom for one account, and every further
 *  account needs its own {@link CREATE_ACCOUNT_GAS_STEP} on top. A batch sent with the
 *  single-account limit runs out partway through, and that failure is the quiet kind: the send
 *  succeeds, the hash is real, and the receipt says nothing was created.
 *
 *  **A re-drain needs no more than a first attempt.** An index whose account already exists is
 *  skipped, and a skip is a code-size check and an event — four skips and one create measured
 *  about the same as one create alone. So the limit is sized by how many indices the authorization
 *  NAMES, and nobody has to know offline which of them are already taken.
 *
 *  Sending a large limit costs nothing extra — the chain refunds what is not burnt — but the
 *  sender must hold the whole prefund while the transaction is in flight, and the block gas limit
 *  is a hard ceiling on the batch regardless of who is paying. That ceiling, not this function, is
 *  what bounds how many accounts one signature can create in one transaction; a batch too large
 *  for a block has to be split into several calls, which the same signature covers.
 *
 *  @param count How many accounts the call creates. The length of the authorization's `indices`,
 *         including any index that will turn out to be taken already.
 *  @returns The limit to send with.
 *  @throws {InvalidInputError} When `count` is not a positive integer. Zero is `NoIndices` on
 *          chain.
 */
export declare function createAccountsGasLimit(count: number): bigint;
/**
 *  The factory's address on a chain.
 *
 *  Identical on every chain it is deployed to — that is what CREATE3 through a shared registry
 *  buys — but read per chain anyway, because "the same everywhere" is a property of what got
 *  deployed and not a licence to hardcode it.
 *
 *  @param chainId EIP-155 chain id.
 *  @param saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The factory proxy's address. Never the implementation's.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 */
export declare function factoryAddress(chainId: number, saltVersion?: string): Address;
/**
 *  An account's address on a chain, derived offline.
 *
 *  The everyday form: takes a chain id, finds that chain's factory in the manifests, and derives.
 *  No round trip, and it answers for an account that does not exist yet — which is the point of
 *  CREATE3 and the reason an address can be published as a deposit target before anything is
 *  deployed.
 *
 *  The answer does not depend on the chain beyond which factory is deployed there, and the factory
 *  is at one address everywhere, so today every chain gives the same account address for the same
 *  `(accountId, index)`. Verified against all three chains on 2026-09-02.
 *
 *  @param chainId EIP-155 chain id.
 *  @param accountId The owner EOA's address. Becomes the account's only owner.
 *  @param index Which of that owner's accounts. Any `uint256`; nothing is reserved.
 *  @param saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The account's address, deployed or not.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 *  @see {@link readAccountAddress} — the authoritative form, when being wrong is expensive.
 */
export declare function accountAddress(chainId: number, accountId: Address, index: bigint, saltVersion?: string): Address;
/**
 *  An account's address as the deployed factory reports it.
 *
 *  **This is the authoritative one.** {@link accountAddress} reproduces the factory's arithmetic in
 *  TypeScript and agrees with it today, but the factory is UUPS-upgradeable: an upgrade could
 *  derive differently, and the offline copy would then be confidently wrong with nothing to notice
 *  it. Ask the chain before publishing a deposit address or moving value; use the offline form for
 *  a screen.
 *
 *  Takes a `chainId` as well as a client because the factory's address comes from the manifests
 *  rather than from the client, and a client pointed at a different chain would answer a question
 *  nobody asked. When the client knows its own chain and it disagrees, that is a bug worth
 *  surfacing here rather than in whatever the address gets used for.
 *
 *  @param client Any viem client that can read.
 *  @param chainId EIP-155 chain id, used to find the factory.
 *  @param accountId The owner EOA's address.
 *  @param index Which of that owner's accounts.
 *  @param saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The account's address, deployed or not.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 *  @throws {WrongNetworkError} When the client is pinned to a different chain, rather than reading
 *          the wrong factory — an answer from the wrong chain is indistinguishable from a right one.
 */
export declare function readAccountAddress(client: Client, chainId: number, accountId: Address, index: bigint, saltVersion?: string): Promise<Address>;
/**
 *  Calldata for `createAccount`.
 *
 *  Two arguments and no owner list. That reads like an omission and is a security property: the
 *  address does not depend on the owners, so a factory that let a caller name them would let anyone
 *  deploy anyone else's account — at the victim's own deterministic address, with an attacker as
 *  co-owner — and CREATE3 gives one address per salt exactly once, so there would be no second
 *  attempt and no recovery. The account comes out owned by `accountId` alone, whoever paid.
 *
 *  Adding a second key is therefore a separate step, taken by the owner through the account's own
 *  {@link addOwnerCall}. That signature is the consent decision "this key may act for me", and it
 *  belongs to the owner rather than to the factory.
 *
 *  @param accountId The owner EOA's address. Becomes the account's only owner.
 *  @param index Which of that owner's accounts.
 *  @returns The calldata.
 */
export declare function encodeCreateAccount(accountId: Address, index: bigint): Hex;
/** A `createAccount` call, with the gas limit it needs. */
export interface CreateAccountCall extends Call {
    /** {@link CREATE_ACCOUNT_GAS_LIMIT}. Read its comment before lowering it. */
    readonly gas: bigint;
}
/**
 *  The whole `createAccount` transaction, ready to send from any EOA that holds gas.
 *
 *  Permissionless and idempotent: an account that already exists is returned rather than
 *  redeployed, so a racing sponsor and user do not make one of them fail. `gas` is carried along
 *  because the limit this call needs is not something a caller can estimate — see
 *  {@link CREATE_ACCOUNT_GAS_LIMIT}.
 *
 *  **Unsigned, and relayer-safe by construction.** There is no signature anywhere in this call and
 *  the factory does not look at `msg.sender`: the owner is forced out of the salt, so whoever pays
 *  cannot influence who ends up owning the account. That is what makes it safe to leave
 *  permissionless, and it means "who signs" is not a question here — only "who pays".
 *
 *  Worth stating because collapsing the two is a real bug rather than a hypothetical one. An app
 *  picked the payer by signing preference (`sessionSigner ?? ownerSigner`) and so billed a mainnet
 *  deploy to an embedded key holding nothing on that chain; what surfaced was the wallet's own
 *  parameter error, which reads as a broken call rather than as an empty wallet. Use
 *  {@link canPayFor} or {@link pickPayer} to choose by balance, and hand the result to a
 *  `Relay` when nobody in the session can pay at all.
 *
 *  @param chainId EIP-155 chain id.
 *  @param accountId The owner EOA's address.
 *  @param index Which of that owner's accounts.
 *  @param saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The call.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 */
export declare function createAccountCall(chainId: number, accountId: Address, index: bigint, saltVersion?: string): CreateAccountCall;
/**
 *  The Safe implementation new accounts are given on a chain.
 *
 *  Worth reading rather than assuming, because it is the factory owner's to change and it decides
 *  what bytecode lands at every account address that has NOT been deployed yet. Already-deployed
 *  accounts are unaffected and no address moves — CREATE3 ignores init code. The manifest's
 *  `safeSingleton` and `fallbackHandler` record what it was at deploy time; this is what it is.
 *
 *  @param client Any viem client that can read.
 *  @param chainId EIP-155 chain id, used to find the factory.
 *  @param saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The singleton and fallback handler, in that order.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 */
export declare function readFactoryImplementation(client: Client, chainId: number, saltVersion?: string): Promise<{
    safeSingleton: Address;
    fallbackHandler: Address;
}>;
/**
 *  Whether this chain's factory accepts a BATCH authorization — several indices under one
 *  signature — or only the single-index form that came before it.
 *
 *  **A deploy-ordering hazard, and the reason this is a read rather than an assumption.** The
 *  factory is upgradeable and sits behind one proxy address on every chain, so "which version is
 *  live here" is per chain and changes at whatever pace the rollout takes. A client that assumes
 *  the new one collects a signature, sends it, and gets a revert with no data in it — after the
 *  person has already approved something.
 *
 *  **Probed through `hashAccountAuthorization`, and specifically through its LIST form.** The
 *  obvious candidates do not work: `MAX_AUTHORIZATION_WINDOW` exists on both versions, and
 *  `UPGRADE_INTERFACE_VERSION` is OpenZeppelin's and unchanged by anything we do. What did change
 *  is this function's selector, because its parameters did — so a call carrying the new selector
 *  reaches no function on the old implementation, falls through the proxy, and reverts with no
 *  data. It is a `view`, so the probe costs one `eth_call` and no gas.
 *
 *  **A read that did not answer is not an answer.** Only a contract-level revert means "the old
 *  factory"; a timeout, a 5xx or a rate limit is rethrown, so a caller can say "could not check"
 *  rather than reporting a chain as un-upgraded because the RPC blinked.
 *
 *  @param client Any viem client that can read.
 *  @param chainId EIP-155 chain id, which locates the factory in the manifests.
 *  @param saltVersion Which salt version, when a chain has more than one committed.
 *  @returns Whether batch authorizations are accepted here.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 *  @throws When the read itself failed, which is not the same as a "no".
 */
export declare function supportsBatchCreation(client: Client, chainId: number, saltVersion?: string): Promise<boolean>;
//# sourceMappingURL=factory.d.ts.map