import type { Address, Hex, PublicClient } from "viem";
import type { AccountAuthorization, CrossChainScan, IndexedAccount, IndexedAuthorization, IndexedModule, IndexedOwner } from "@somnia-chain/accounts-sdk";
import type { SomniaMarketsAccount } from "../account.js";
import type { ExecutorSpec } from "../executor/create.js";
import type { Executor } from "../executor/types.js";
import { type AccountActivityPage, type AccountFactoryHistoryPage, type AccountFactoryState, type AccountFeedPageOptions, type AccountsIndexerStatus, type AccountsPage, type GetActivityPageOptions, type GetFactoryHistoryPageOptions, type ListModuleHistoryOptions, type ListControlledAccountsOptions, type ListOwnerHistoryOptions, type UnsignedAccountCreation } from "../smartAccounts.js";
/**
 *  Who sends a multi-chain account's outer transactions on each chain: a
 *  Somnia session seed (the same seed derives the same session address on
 *  every chain, so ONE key owns the account everywhere), or a factory that
 *  names an executor per chain for anything more particular.
 *
 *  **Gotchas**
 *
 *  - A seed signs locally. `accountFor` derives the seed's key
 *    (`sessionPrivateKey(seed)`) and builds each chain's inner as that
 *    engine's local signer, so the seed never goes to a node. The session
 *    address is the same one the node derives.
 *  - Use one sending mode per address. Local and node-side sends from the same
 *    address share one nonce space. Do not also send node-side from this seed.
 *  - A factory must not return a `createExecutor({ sessionSeed })` executor.
 *    It sends the seed to the node on every write, so `accountFor` refuses it
 *    with {@link InvalidInputError}.
 *
 * @category accounts
 */
export type SmartAccountInner = {
    sessionSeed: Hex;
} | ((chainId: number) => Executor);
/**
 *  The exchange-level smart-accounts surface, reached as `exchange.accounts`.
 *  Spans every configured chain the accounts SDK covers; a configured chain it
 *  does not cover (a local anvil beside a testnet) is skipped where skipping
 *  is safe and refused where it is not — each member says which.
 *
 * @category accounts
 */
export interface ExchangeSmartAccounts {
    /**
     *  The address `(accountId, index)` derives to — the same on every covered
     *  chain. Pure; no read.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered by
     *    the accounts SDK.
     */
    addressOf(accountId: Address, index: bigint): Address;
    /**
     *  Scan `accountId`'s derived accounts on every covered configured chain at
     *  once: which slots are deployed where, which are empty, and which reads
     *  did not answer. Chain reads (current to head).
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered, or
     *    the range is empty or wider than the accounts SDK's scan cap.
     */
    scan(accountId: Address, options?: {
        maxIndex?: bigint;
        indices?: readonly bigint[];
    }): Promise<CrossChainScan>;
    /**
     *  Turn one signed authorization (from
     *  `client.accounts.buildAccountAuthorization` — its domain omits the chain
     *  id for exactly this) into one creation call PER covered configured
     *  chain. Each call needs its own funded sender; a chain that fails is
     *  retried on its own, not rolled back.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered.
     */
    buildCreateAccounts(authorization: AccountAuthorization, signature: Hex): readonly UnsignedAccountCreation[];
    /**
     *  The multi-chain account the exchange trades through, in one call: the
     *  derived address plus a smart-account executor per covered configured
     *  chain, each driving the account through `inner` on that chain. Hand the
     *  result to the exchange config's `account`.
     *
     *  **Gotchas**
     *
     *  A configured chain the accounts SDK does not cover gets NO executor —
     *  writes routed there will be refused by the facade's own missing-executor
     *  handling, not silently sent as someone else.
     *
     *  A `{ sessionSeed }` inner signs locally on every chain; no request
     *  carries the seed. See {@link SmartAccountInner}.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered, the
     *    seed is not 32 bytes of hex, or a factory returns an executor for
     *    another chain or a `createExecutor({ sessionSeed })` executor.
     *  - Throws {@link NotConfiguredError} - a covered chain's engine has no
     *    chain transport.
     */
    accountFor(accountId: Address, index: bigint, inner: SmartAccountInner): SomniaMarketsAccount;
    /**
     *  What the accounts indexer knows about one address, on every configured
     *  chain that has an accounts indexer: one entry per chain where the factory
     *  made an account at that address, `[]` when none did. The same address can
     *  be a DIFFERENT account on each chain, so every entry carries its
     *  `chainId`. Indexer read.
     *
     *  **Details**
     *
     *  Unlike the markets indexer, one accounts-indexer deployment serves an
     *  environment (Somnia testnet and Hideki share one), and every row names its
     *  chain — so this is one request per deployment, not per chain. Configured
     *  chains without an accounts indexer are skipped.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered, or
     *    `address` is not an address.
     *  - Throws {@link NotConfiguredError} - no covered chain has an accounts
     *    indexer.
     *  - Throws {@link IndexerError} - an indexer request failed; `cause` has
     *    the original. The complete union is `SmartAccountsIndexedReadError`.
     */
    listIndexedAccounts(address: Address): Promise<IndexedAccount[]>;
    /**
     *  Every account derived from `accountId`, across the indexed configured
     *  chains, each carrying its `chainId`. See
     *  `client.accounts.listDerivedAccounts`. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered, or
     *    `accountId` is not an address.
     *  - Throws {@link NotConfiguredError} - no covered chain has an accounts
     *    indexer.
     *  - Throws {@link IndexerError} - an indexer request failed. The complete
     *    union is `SmartAccountsIndexedReadError`.
     */
    listDerivedAccounts(accountId: Address): Promise<IndexedAccount[]>;
    /**
     *  Every account `owner` can act on, across the indexed configured chains,
     *  each carrying its `chainId`. See `client.accounts.listControlledAccounts`.
     *  Indexer read.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered, or
     *    `owner` is not an address.
     *  - Throws {@link NotConfiguredError} - no covered chain has an accounts
     *    indexer.
     *  - Throws {@link IndexerError} - an indexer request failed. The complete
     *    union is `SmartAccountsIndexedReadError`.
     */
    listControlledAccounts(owner: Address, options?: ListControlledAccountsOptions): Promise<IndexedAccount[]>;
    /**
     *  An account's owner history across the indexed configured chains, each
     *  entry carrying its `chainId`. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered, or
     *    `account` is not an address.
     *  - Throws {@link NotConfiguredError} - no covered chain has an accounts
     *    indexer.
     *  - Throws {@link IndexerError} - an indexer request failed. The complete
     *    union is `SmartAccountsIndexedReadError`.
     */
    listOwnerHistory(account: Address, options?: ListOwnerHistoryOptions): Promise<IndexedOwner[]>;
    /**
     *  One page of an account's history across the indexed configured chains,
     *  newest first, merged across chains by time, each event carrying its
     *  `chainId`. Pass `nextCursor` back as `cursor` for the next page; each
     *  chain resumes from its own position. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered,
     *    `account` is not an address, or a kind is unknown.
     *  - Throws {@link NotConfiguredError} - no covered chain has an accounts
     *    indexer.
     *  - Throws {@link IndexerError} - an indexer request failed. The complete
     *    union is `SmartAccountsIndexedReadError`.
     */
    getActivityPage(account: Address, options?: GetActivityPageOptions): Promise<AccountActivityPage>;
    /**
     *  How far behind the accounts indexer is on each indexed configured chain,
     *  in configuration order. Chains lag independently. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered.
     *  - Throws {@link NotConfiguredError} - no covered chain has an accounts
     *    indexer.
     *  - Throws {@link IndexerError} - an indexer request failed, or an
     *    indexer does not serve a chain it should. The complete union is
     *    `SmartAccountsIndexedReadError`.
     */
    listIndexerStatus(): Promise<AccountsIndexerStatus[]>;
    /**
     *  Every module an account has enabled, across the indexed configured
     *  chains, each carrying its `chainId`. See
     *  `client.accounts.listModuleHistory`. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered, or
     *    `account` is not an address.
     *  - Throws {@link NotConfiguredError} - no covered chain has an accounts
     *    indexer.
     *  - Throws {@link IndexerError} - an indexer request failed. The complete
     *    union is `SmartAccountsIndexedReadError`.
     */
    listModuleHistory(account: Address, options?: ListModuleHistoryOptions): Promise<IndexedModule[]>;
    /**
     *  The signed authorization an account was created from, one per indexed
     *  configured chain where it was created from one, each carrying its
     *  `chainId`. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered, or
     *    `account` is not an address.
     *  - Throws {@link NotConfiguredError} - no covered chain has an accounts
     *    indexer.
     *  - Throws {@link IndexerError} - an indexer request failed. The complete
     *    union is `SmartAccountsIndexedReadError`.
     */
    listCreationAuthorizations(account: Address): Promise<IndexedAuthorization[]>;
    /**
     *  The account factory on each indexed configured chain. See
     *  `client.accounts.getFactoryState`. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered.
     *  - Throws {@link NotConfiguredError} - no covered chain has an accounts
     *    indexer.
     *  - Throws {@link IndexerError} - an indexer request failed. The complete
     *    union is `SmartAccountsIndexedReadError`.
     */
    listFactoryStates(): Promise<AccountFactoryState[]>;
    /**
     *  Every account the factory made, across the indexed configured chains,
     *  newest first and merged by time. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered, the
     *    limit is out of range, or the cursor belongs to another read.
     *  - Throws {@link NotConfiguredError} - no covered chain has an accounts
     *    indexer.
     *  - Throws {@link IndexerError} - an indexer request failed. The complete
     *    union is `SmartAccountsIndexedReadError`.
     */
    getAccountsPage(options?: AccountFeedPageOptions): Promise<AccountsPage>;
    /**
     *  What every account the factory made has done, across the indexed
     *  configured chains, newest first and merged by time. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered, a
     *    kind is unknown, the limit is out of range, or the cursor belongs to
     *    another read.
     *  - Throws {@link NotConfiguredError} - no covered chain has an accounts
     *    indexer.
     *  - Throws {@link IndexerError} - an indexer request failed. The complete
     *    union is `SmartAccountsIndexedReadError`.
     */
    getNetworkActivityPage(options?: GetActivityPageOptions): Promise<AccountActivityPage>;
    /**
     *  The account factory's lifecycle across the indexed configured chains,
     *  newest first and merged by time. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - no configured chain is covered, a
     *    kind is unknown, the limit is out of range, or the cursor belongs to
     *    another read.
     *  - Throws {@link NotConfiguredError} - no covered chain has an accounts
     *    indexer.
     *  - Throws {@link IndexerError} - an indexer request failed. The complete
     *    union is `SmartAccountsIndexedReadError`.
     */
    getFactoryHistoryPage(options?: GetFactoryHistoryPageOptions): Promise<AccountFactoryHistoryPage>;
}
/** What the exchange surface draws from its owning facade. */
export interface ExchangeSmartAccountsDeps {
    chainIds: () => readonly number[];
    engineFor: (chainId: number) => {
        createExecutor: (spec: ExecutorSpec) => Executor;
        getViemClient: () => PublicClient;
    };
}
/**
 *  Bind the exchange-level smart-accounts surface to a facade's chain set.
 *
 * @internal
 */
export declare function createExchangeSmartAccounts(deps: ExchangeSmartAccountsDeps): ExchangeSmartAccounts;
