import type { Address, Hex, PublicClient, TypedDataDefinition } from "viem";
import * as Accounts from "@somnia-chain/accounts-sdk";
import type { AccountAuthorization, AccountEvent, AccountEventKind, AccountScan, AccountTree, CustodyChain, FactoryEvent as AccountsFactoryEvent, FactoryEventKind as AccountsFactoryEventKind, FactoryState as AccountsFactoryState, HealthReport, Holdings, IndexedAccount, IndexedAuthorization, IndexedModule, IndexedOwner, OwnerSet, TokenAmount } from "@somnia-chain/accounts-sdk";
import type { ClientConfig } from "./config.js";
import { AccountFeedRestartRequiredError, AccountsIndexerUnavailableError, IndexerError, InvalidInputError, NotConfiguredError, RpcError } from "./errors.js";
import type { UnsignedCall } from "./writer.js";
/**
 *  The EIP-712 payload an account authorization is signed over — what
 *  {@link SmartAccountsClient.buildAccountAuthorization} hands back beside the
 *  authorization itself.
 *
 * @category accounts
 */
export type AccountAuthorizationTypedData = ReturnType<typeof Accounts.accountAuthorizationTypedData>;
/**
 *  An account authorization with the payload its owner signs: hand
 *  `typedData` to any EIP-712 signer (a wallet client, an executor's
 *  `signTypedData`), then pass `authorization` + the signature to
 *  {@link SmartAccountsClient.buildCreateAccounts}.
 *
 * @category accounts
 */
export interface PreparedAccountAuthorization {
    /** What the owner authorizes: which accounts, which owners, until when. */
    readonly authorization: AccountAuthorization;
    /** The EIP-712 payload to sign. Its domain deliberately omits the chain id — one signature settles on every chain. */
    readonly typedData: AccountAuthorizationTypedData;
}
/**
 *  An account-creation call with the gas it needs. Safe's `setup` runs nested,
 *  so EIP-150 makes creation need a floor of gas REMAINING that no estimate of
 *  gas spent supplies — send it as `executor.execute([call], { gas })`.
 *
 * @category accounts
 */
export interface UnsignedAccountCreation {
    /** The creation call, aimed at the factory. Any funded actor may send it. */
    readonly call: UnsignedCall;
    /** The gas the transaction must carry. Not an estimate — a floor the accounts SDK measured. */
    readonly gas: bigint;
}
/**
 *  A prepared account execution for the sign-now-send-later flow: the signer
 *  signs `typedData` (or `digest`) HERE, and `toCall(signature)` is the
 *  finished call ANY funded sender may broadcast — your backend, a relayer, a
 *  different key. Nothing about it is bound to this client's transport.
 *
 *  **Details**
 *
 *  Send the resulting call with at least `gasFloor` gas: safe frames run
 *  nested, and EIP-150 makes the execution need a floor of gas REMAINING that
 *  no estimate of gas spent supplies. Assert the receipt's `status` yourself —
 *  a hand-rolled send has no writer to do it.
 *
 * @category accounts
 */
export interface PreparedAccountExecution {
    /**
     *  The EIP-712 payload to sign: the account's own Safe transaction when the
     *  signer owns it directly, or the outermost parent's `SafeMessage` envelope
     *  when `through` names parents. Chain-bound either way.
     */
    readonly typedData: TypedDataDefinition;
    /** The same thing as 32 bytes, for a signer that will not render the payload. */
    readonly digest: Hex;
    /** The address the signature must recover to. */
    readonly signer: Address;
    /** The least gas the broadcast must carry. A floor, not an estimate. */
    readonly gasFloor: bigint;
    /** Turn the signature into the call. Aimed at the account; any funded sender may broadcast it. */
    toCall(signature: Hex): UnsignedCall;
}
/**
 *  Failures from the capability's reads: an input the accounts SDK refuses
 *  (including a chain it has no deployment for), or a transport failure with
 *  the original as `cause`.
 *
 * @category errors
 */
export type SmartAccountsReadError = InvalidInputError | RpcError;
/**
 *  Failures from the capability's indexed reads: an input the accounts SDK
 *  refuses (including a chain it has no deployment for), a chain with no
 *  accounts indexer behind it, or an indexer request that failed — the
 *  original as `cause`.
 *
 * @category errors
 */
export type SmartAccountsIndexedReadError = InvalidInputError | NotConfiguredError | IndexerError | AccountsIndexerUnavailableError | AccountFeedRestartRequiredError;
/**
 *  One page of indexed account history, newest first, and where to continue.
 *
 *  **Details**
 *
 *  Markets' own page shape (the same as the fills feeds), not the accounts
 *  SDK's: the wrapper translates, so a change in the accounts SDK stays inside
 *  it. `nextCursor` is opaque and bound to the read that issued it — pass it
 *  back as `cursor` to the SAME read with the same filter; `null` means the
 *  feed is drained.
 *
 * @category accounts
 */
export interface AccountActivityPage {
    readonly items: readonly AccountEvent[];
    readonly nextCursor: string | null;
}
/**
 *  One page of accounts the factory made, newest first, and where to continue.
 *  Same cursor contract as {@link AccountActivityPage}.
 *
 * @category accounts
 */
export interface AccountsPage {
    readonly items: readonly IndexedAccount[];
    readonly nextCursor: string | null;
}
/**
 *  One page of the account factory's own lifecycle, newest first, and where to
 *  continue. Same cursor contract as {@link AccountActivityPage}.
 *
 * @category accounts
 */
export interface AccountFactoryHistoryPage {
    readonly items: readonly AccountFactoryEvent[];
    readonly nextCursor: string | null;
}
/**
 *  How far behind the ACCOUNTS indexer is on one chain — a separate indexer
 *  from the markets one `fetchDataStatus` reports on.
 *
 * @category accounts
 */
export interface AccountsIndexerStatus {
    readonly chainId: number;
    /** The last block whose events are in the index. */
    readonly indexedBlock: bigint;
    /** The chain head the indexer has seen. */
    readonly chainHead: bigint;
    /** `chainHead - indexedBlock`; `0n` when caught up. */
    readonly behindBy: bigint;
    /** When the last indexed block was produced (unix seconds), when the index says. */
    readonly indexedBlockTime: bigint | undefined;
    /** How old the newest indexed block is, in seconds, as of `observedAt`. `undefined` when unknown. */
    readonly lagSeconds: bigint | undefined;
    /** When this was measured, on this machine's clock (unix seconds). */
    readonly observedAt: bigint;
    /** Whether the index has caught up at least once since it was last (re)built — `false` mid-backfill. */
    readonly ready: boolean;
}
/**
 *  The account factory on one chain, as the accounts indexer last saw it: its
 *  admin, what NEW accounts get, and an exact count of accounts it made.
 *
 * @category accounts
 */
export type AccountFactoryState = AccountsFactoryState;
/**
 *  One thing that happened to the account factory itself (an upgrade, an
 *  admin change, a new Safe for new accounts, a signing-domain change).
 *
 * @category accounts
 */
export type AccountFactoryEvent = AccountsFactoryEvent;
/**
 *  The kinds of {@link AccountFactoryEvent}.
 *
 * @category accounts
 */
export type AccountFactoryEventKind = AccountsFactoryEventKind;
/**
 *  Paging options shared by the indexed account feeds.
 *
 * @category accounts
 */
export interface AccountFeedPageOptions {
    /** Items on the page, newest first. Default 50, at most 1000. */
    limit?: number;
    /** The `nextCursor` of the preceding page of the same read. Omit for the newest page. */
    cursor?: string;
}
/**
 *  Options for {@link SmartAccountsClient.listControlledAccounts}.
 *
 * @category accounts
 */
export interface ListControlledAccountsOptions {
    /** Also return accounts this address USED to own. Default `false`: only what it can act on now. */
    includeFormer?: boolean;
}
/**
 *  Options for {@link SmartAccountsClient.listOwnerHistory}.
 *
 * @category accounts
 */
export interface ListOwnerHistoryOptions {
    /** Also return removed owners, with the block they left. Default `false`. */
    includeFormer?: boolean;
}
/**
 *  Options for {@link SmartAccountsClient.getActivityPage}.
 *
 * @category accounts
 */
export interface GetActivityPageOptions extends AccountFeedPageOptions {
    /** Only these kinds. Omit for every kind. Filtered at the indexer. */
    kinds?: readonly AccountEventKind[];
}
/**
 *  Options for {@link SmartAccountsClient.listModuleHistory}.
 *
 * @category accounts
 */
export interface ListModuleHistoryOptions {
    /** Also return modules that were removed again. Default `false`. */
    includeFormer?: boolean;
}
/**
 *  Options for {@link SmartAccountsClient.getFactoryHistoryPage}.
 *
 * @category accounts
 */
export interface GetFactoryHistoryPageOptions extends AccountFeedPageOptions {
    /** Only these kinds. Omit for every kind. */
    kinds?: readonly AccountFactoryEventKind[];
}
/**
 *  Failures from the capability's pure builders: an input the accounts SDK
 *  refuses — nothing here touches the network.
 *
 * @category errors
 */
export type SmartAccountsBuildError = InvalidInputError;
/**
 *  The smart-accounts capability — the factory account model of
 *  `@somnia-chain/accounts-sdk`, bound to one markets client's chain and
 *  transport. Reached as `client.accounts`.
 *
 *  **Details**
 *
 *  Reads go through the owning client's chain transport. The `build*` members
 *  return {@link UnsignedCall}s (or {@link UnsignedAccountCreation}s carrying
 *  their gas) for any executor to send — creation by whoever pays, owner
 *  management and transfers through the account's own smart-account executor
 *  (`client.createExecutor({ smartAccount, inner })`), so the account
 *  administers itself.
 *
 *  Every member is refused with {@link InvalidInputError} on a chain the
 *  accounts SDK has no deployment for (Somnia mainnet 5031, Somnia testnet
 *  50312 and Hideki testnet 50383 are covered; the factory sits at the same
 *  address on each).
 *
 * @category accounts
 */
export interface SmartAccountsClient {
    /**
     *  The address `(accountId, index)` derives to on this chain — the same on
     *  every covered chain, deployed or not. Pure; no read.
     *
     *  **Gotchas**
     *
     *  The factory is upgradeable, so this is a prediction: fine for a screen,
     *  but read {@link SmartAccountsClient.find} (or the accounts SDK's
     *  authoritative read) before publishing a deposit address.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered. The
     *    complete union is {@link SmartAccountsBuildError}.
     */
    addressOf(accountId: Address, index: bigint): Address;
    /**
     *  Scan which of `accountId`'s derived accounts are deployed, from index 0
     *  upward. Chain read (current to head).
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, or the
     *    range is empty or wider than the accounts SDK's scan cap.
     *  - Throws {@link RpcError} - the transport failed outright; `cause` has
     *    the original. A single index that did not answer is reported inside
     *    the scan instead. The complete union is {@link SmartAccountsReadError}.
     */
    find(accountId: Address, options?: {
        maxIndex?: bigint;
    }): Promise<AccountScan>;
    /**
     *  The lowest index with no deployed account, for creating the next one.
     *  Chain read (current to head).
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered.
     *  - Throws {@link RpcError} - no read answered — the accounts SDK refuses
     *    to hand out a possibly-taken index. The complete union is
     *    {@link SmartAccountsReadError}.
     */
    nextFreeIndex(accountId: Address, options?: {
        from?: bigint;
    }): Promise<bigint>;
    /**
     *  An account's owner set: each owner classified as a key or another
     *  account, plus the threshold. Chain read (current to head).
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered.
     *  - Throws {@link RpcError} - the transport failed; `cause` has the
     *    original. The complete union is {@link SmartAccountsReadError}.
     */
    ownersOf(account: Address): Promise<OwnerSet>;
    /**
     *  Walk DOWN from an account to the keys that ultimately control it, across
     *  accounts owning accounts. Chain read (current to head).
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered.
     *  - Throws {@link RpcError} - the transport failed; `cause` has the
     *    original. An unreadable branch is skipped and reported in the result
     *    instead. The complete union is {@link SmartAccountsReadError}.
     */
    custodyChain(account: Address, options?: {
        maxDepth?: number;
    }): Promise<CustodyChain>;
    /**
     *  Walk UP from a signer: the parent accounts between it and `account`,
     *  nearest first — exactly what the smart-account executor spec takes as
     *  `through`. `null` when the signer has no authority over the account
     *  (a real answer, not an error). Chain read (current to head).
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered.
     *  - Throws {@link RpcError} - the transport failed; `cause` has the
     *    original. The complete union is {@link SmartAccountsReadError}.
     */
    authorityPath(account: Address, signer: Address, options?: {
        maxDepth?: number;
    }): Promise<readonly Address[] | null>;
    /**
     *  The tree of accounts under one root — every deployed account derived
     *  from it, and from those, recursively. Chain read (current to head).
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered.
     *  - Throws {@link RpcError} - the transport failed; `cause` has the
     *    original. The complete union is {@link SmartAccountsReadError}.
     */
    tree(root: Address, options?: {
        maxIndex?: bigint;
        indices?: readonly bigint[];
        maxDepth?: number;
    }): Promise<AccountTree>;
    /**
     *  An account's native balance and the balances of the tokens asked about.
     *  A balance is `undefined` where the read did not answer — never silently
     *  zero. Chain read (current to head).
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered.
     *  - Throws {@link RpcError} - the transport failed; `cause` has the
     *    original. The complete union is {@link SmartAccountsReadError}.
     */
    holdings(account: Address, tokens?: readonly Address[]): Promise<Holdings>;
    /**
     *  Evaluate an account's setup against the factory's canonical shape:
     *  singleton, fallback handler, owners, threshold, modules — each finding
     *  with a severity. Chain read (current to head).
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered.
     *  - Throws {@link RpcError} - the transport failed; `cause` has the
     *    original. The complete union is {@link SmartAccountsReadError}.
     */
    health(account: Address): Promise<HealthReport>;
    /**
     *  Prepare an execution whose signer is NOT the sender — the
     *  sign-now-send-later flow: the owner signs here, and the finished call
     *  goes to whoever pays (your backend, a relayer). The executor path
     *  (`createExecutor({ smartAccount, … })`) is the right tool when the same
     *  process signs and sends; this is for when it is not. One nonce read
     *  through this client, skipped when `nonce` is given — an account's FIRST
     *  action can be prepared and signed before the account is deployed, at
     *  nonce 0. Chain read (current to head) unless `nonce` is given.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, `calls`
     *    is empty, or a call names another chain.
     *  - Throws {@link RpcError} - the nonce read failed; `cause` has the
     *    original. The complete union is {@link SmartAccountsReadError}.
     */
    buildExecution(args: {
        /** The account that acts. */
        account: Address;
        /** What it does. Several calls batch into one account transaction. */
        calls: readonly UnsignedCall[];
        /** The address that will sign — an owner of the account, or of the outermost parent. */
        signer: Address;
        /** The parent accounts between the signer and `account`, nearest first. */
        through?: readonly Address[];
        /**
         *  The account's nonce, when the caller already knows it — no read is
         *  performed. `0n` prepares an undeployed account's first action.
         */
        nonce?: bigint;
    }): Promise<PreparedAccountExecution>;
    /**
     *  Build the call that deploys `(accountId, index)`'s account on this
     *  chain. Permissionless and idempotent: no signature from anybody — the
     *  owner is forced out of the CREATE3 salt, so a sponsor cannot inject one.
     *  Send as `executor.execute([r.call], { gas: r.gas })`.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered. The
     *    complete union is {@link SmartAccountsBuildError}.
     */
    buildCreateAccount(accountId: Address, index: bigint): UnsignedAccountCreation;
    /**
     *  Build the authorization one owner signature settles: several accounts,
     *  optional additional owners (a session key) and threshold, valid on EVERY
     *  covered chain — the domain deliberately omits the chain id. Sign
     *  `typedData` with any EIP-712 signer, then hand the pair to
     *  {@link SmartAccountsClient.buildCreateAccounts} (or the exchange-level
     *  fan-out). Pure; no read.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, no index
     *    is named, or the validity window exceeds what every chain accepts. The
     *    complete union is {@link SmartAccountsBuildError}.
     */
    buildAccountAuthorization(args: {
        /** The address the accounts derive from — the EOA (or account) that signs. */
        accountId: Address;
        /** Which indices to create. At least one. */
        indices: readonly bigint[];
        /** Extra owners installed at creation — typically one session key. */
        additionalOwners?: readonly Address[];
        /** Signature threshold for the created accounts. Default 1. */
        threshold?: bigint;
        /** Seconds the signature stays valid. Default 900, max 18,000. */
        window?: bigint;
        /** Unix seconds "now". Defaults to the system clock. */
        now?: bigint;
    }): PreparedAccountAuthorization;
    /**
     *  Turn a signed authorization into this chain's creation call. Any funded
     *  actor may send it; the accounts the authorization names that already
     *  exist are skipped, not reverted. For every covered chain at once, use
     *  the exchange-level `exchange.accounts.buildCreateAccounts`.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered. The
     *    complete union is {@link SmartAccountsBuildError}.
     */
    buildCreateAccounts(authorization: AccountAuthorization, signature: Hex): UnsignedAccountCreation;
    /**
     *  Build the call that adds an owner (typically a session key) to an
     *  account, setting the threshold. Execute it THROUGH the account itself:
     *  `client.createExecutor({ smartAccount: account, inner })`.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered. The
     *    complete union is {@link SmartAccountsBuildError}.
     */
    buildAddOwner(account: Address, owner: Address, threshold: bigint): UnsignedCall;
    /**
     *  Build the call that swaps one owner for another. `owners` is the
     *  account's CURRENT owner list ({@link SmartAccountsClient.ownersOf}) —
     *  Safe's owner list is linked, so the call names the predecessor.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, or
     *    `oldOwner` is not in `owners`. The complete union is
     *    {@link SmartAccountsBuildError}.
     */
    buildSwapOwner(account: Address, owners: readonly Address[], oldOwner: Address, newOwner: Address): UnsignedCall;
    /**
     *  Build the call that removes an owner, setting the threshold. `owners` is
     *  the account's CURRENT owner list.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, or
     *    `owner` is not in `owners`. The complete union is
     *    {@link SmartAccountsBuildError}.
     */
    buildRemoveOwner(account: Address, owners: readonly Address[], owner: Address, threshold: bigint): UnsignedCall;
    /**
     *  Build the call that changes the account's signature threshold.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered. The
     *    complete union is {@link SmartAccountsBuildError}.
     */
    buildChangeThreshold(account: Address, threshold: bigint): UnsignedCall;
    /**
     *  Build the calls that move native value and/or ERC-20 amounts OUT of an
     *  account. Execute them through that account's smart-account executor —
     *  the account holding the funds is the one that sends.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, or
     *    nothing is being moved. The complete union is
     *    {@link SmartAccountsBuildError}.
     */
    buildTransfer(args: {
        /** The recipient. */
        to: Address;
        /** Wei of native value to move. */
        native?: bigint;
        /** ERC-20 amounts to move, in raw token units. */
        tokens?: readonly TokenAmount[];
    }): readonly UnsignedCall[];
    /**
     *  What the accounts indexer knows about one address on this chain: whose
     *  account it is (`derivation`), who paid for it, its configuration and
     *  activity counts. `null` when the address is not an account the factory
     *  made — the reverse lookup no chain read can do. Indexer read; check
     *  {@link SmartAccountsClient.getIndexerStatus} for how far behind it is.
     *
     *  **Gotchas**
     *
     *  Only accounts `SomniaAccountFactory` made come back. A Safe from another
     *  factory is `null` here even though the index watches it.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, or
     *    `address` is not an address.
     *  - Throws {@link NotConfiguredError} - the chain has no accounts indexer.
     *  - Throws {@link IndexerError} - the indexer request failed; `cause` has
     *    the original. The complete union is {@link SmartAccountsIndexedReadError}.
     */
    getIndexedAccount(address: Address): Promise<IndexedAccount | null>;
    /**
     *  Every account derived from `accountId` on this chain, newest first — all of
     *  them: the read follows every page. Also the sub-account tree: pass an
     *  account to list its children. Unlike {@link SmartAccountsClient.find}, no
     *  index window — the indexer saw every creation. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, or
     *    `accountId` is not an address.
     *  - Throws {@link NotConfiguredError} - the chain has no accounts indexer.
     *  - Throws {@link IndexerError} - the indexer request failed; `cause` has
     *    the original. The complete union is {@link SmartAccountsIndexedReadError}.
     */
    listDerivedAccounts(accountId: Address): Promise<IndexedAccount[]>;
    /**
     *  Every account `owner` can act on as an owner on this chain — including
     *  accounts it was ADDED to, which no derivation finds. All of them: the read
     *  follows every page. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, or
     *    `owner` is not an address.
     *  - Throws {@link NotConfiguredError} - the chain has no accounts indexer.
     *  - Throws {@link IndexerError} - the indexer request failed; `cause` has
     *    the original. The complete union is {@link SmartAccountsIndexedReadError}.
     */
    listControlledAccounts(owner: Address, options?: ListControlledAccountsOptions): Promise<IndexedAccount[]>;
    /**
     *  How an account's owner set came to be: who was added when, and who was
     *  removed. {@link SmartAccountsClient.ownersOf} answers who the owners are
     *  NOW, from the chain. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, or
     *    `account` is not an address.
     *  - Throws {@link NotConfiguredError} - the chain has no accounts indexer.
     *  - Throws {@link IndexerError} - the indexer request failed; `cause` has
     *    the original. The complete union is {@link SmartAccountsIndexedReadError}.
     */
    listOwnerHistory(account: Address, options?: ListOwnerHistoryOptions): Promise<IndexedOwner[]>;
    /**
     *  One page of an account's history on this chain, newest first: creation,
     *  owner changes, executions (with what they did, when recoverable),
     *  incoming native value. Pass `nextCursor` back as `cursor` for the next
     *  page; `null` means this was the last. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, `account`
     *    is not an address, or a kind is unknown.
     *  - Throws {@link NotConfiguredError} - the chain has no accounts indexer.
     *  - Throws {@link IndexerError} - the indexer request failed; `cause` has
     *    the original. The complete union is {@link SmartAccountsIndexedReadError}.
     */
    getActivityPage(account: Address, options?: GetActivityPageOptions): Promise<AccountActivityPage>;
    /**
     *  How far behind the accounts indexer is on this chain. Render a hedge —
     *  "as of block N" — when `behindBy` is large, rather than an owner set or
     *  a count that stopped being true. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered.
     *  - Throws {@link NotConfiguredError} - the chain has no accounts indexer.
     *  - Throws {@link IndexerError} - the indexer request failed, or it does
     *    not serve this chain; `cause` has the original. The complete union is
     *    {@link SmartAccountsIndexedReadError}.
     */
    getIndexerStatus(): Promise<AccountsIndexerStatus>;
    /**
     *  Every module an account has enabled on this chain, oldest first — a
     *  module acts with no owner signature, so this is part of who controls the
     *  account. Removed ones with `includeFormer`. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, or
     *    `account` is not an address.
     *  - Throws {@link NotConfiguredError} - the chain has no accounts indexer.
     *  - Throws {@link IndexerError} - the indexer request failed; `cause` has
     *    the original. The complete union is {@link SmartAccountsIndexedReadError}.
     */
    listModuleHistory(account: Address, options?: ListModuleHistoryOptions): Promise<IndexedModule[]>;
    /**
     *  The signed authorization an account was created from on this chain — the
     *  signer, the owners it added beside itself, threshold and deadline — or
     *  `null` when it was created by a plain `createAccount`. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, or
     *    `account` is not an address.
     *  - Throws {@link NotConfiguredError} - the chain has no accounts indexer.
     *  - Throws {@link IndexerError} - the indexer request failed; `cause` has
     *    the original. The complete union is {@link SmartAccountsIndexedReadError}.
     */
    getCreationAuthorization(account: Address): Promise<IndexedAuthorization | null>;
    /**
     *  The account factory on this chain: admin, implementation, the Safe new
     *  accounts get, and an exact count of accounts it made. `null` when the
     *  indexer has no factory row for this chain. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered.
     *  - Throws {@link NotConfiguredError} - the chain has no accounts indexer.
     *  - Throws {@link IndexerError} - the indexer request failed; `cause` has
     *    the original. The complete union is {@link SmartAccountsIndexedReadError}.
     */
    getFactoryState(): Promise<AccountFactoryState | null>;
    /**
     *  Every account the factory made on this chain, newest first, a page at a
     *  time — the network's accounts, for a front page or an explorer list.
     *  Indexer read.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, the limit
     *    is out of range, or the cursor belongs to another read.
     *  - Throws {@link NotConfiguredError} - the chain has no accounts indexer.
     *  - Throws {@link IndexerError} - the indexer request failed; `cause` has
     *    the original. The complete union is {@link SmartAccountsIndexedReadError}.
     */
    getAccountsPage(options?: AccountFeedPageOptions): Promise<AccountsPage>;
    /**
     *  What every account the factory made has done on this chain, newest
     *  first, a page at a time. {@link SmartAccountsClient.getActivityPage} is
     *  one account's. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, a kind is
     *    unknown, the limit is out of range, or the cursor belongs to another read.
     *  - Throws {@link NotConfiguredError} - the chain has no accounts indexer.
     *  - Throws {@link IndexerError} - the indexer request failed; `cause` has
     *    the original. The complete union is {@link SmartAccountsIndexedReadError}.
     */
    getNetworkActivityPage(options?: GetActivityPageOptions): Promise<AccountActivityPage>;
    /**
     *  The account factory's own lifecycle on this chain, newest first:
     *  initialisation, upgrades, admin changes, a new Safe for new accounts, and
     *  `DomainChanged` — when every unspent creation authorization stopped
     *  verifying. Indexer read.
     *
     *  - Throws {@link InvalidInputError} - the chain is not covered, a kind is
     *    unknown, the limit is out of range, or the cursor belongs to another read.
     *  - Throws {@link NotConfiguredError} - the chain has no accounts indexer.
     *  - Throws {@link IndexerError} - the indexer request failed; `cause` has
     *    the original. The complete union is {@link SmartAccountsIndexedReadError}.
     */
    getFactoryHistoryPage(options?: GetFactoryHistoryPageOptions): Promise<AccountFactoryHistoryPage>;
}
/** What the capability draws from its owning client. */
interface SmartAccountsDeps {
    getConfig: () => ClientConfig;
    getClient: () => PublicClient;
}
/**
 *  The paging fields the accounts SDK takes, from markets' options — copied
 *  field by field, so a markets option never reaches the accounts SDK by name.
 *
 * @internal
 */
export declare function pageArgs(options: AccountFeedPageOptions): {
    limit?: number;
    cursor?: string;
};
/**
 *  An accounts-SDK page as markets' own page shape. Built field by field: if
 *  the accounts SDK renames its page, this stops compiling instead of the
 *  rename reaching markets' callers.
 *
 * @internal
 */
export declare function toPage<T>(page: {
    items: readonly T[];
    nextCursor: string | null;
}): {
    readonly items: readonly T[];
    readonly nextCursor: string | null;
};
/**
 *  Every item of an accounts-SDK feed, following `nextCursor` until it is
 *  drained — so a `list*` read never stops at a page boundary and hands back a
 *  silently shortened answer.
 *
 * @internal
 */
export declare function everyPage<T>(read: (cursor: {
    limit: number;
    cursor?: string;
}) => Promise<{
    items: readonly T[];
    nextCursor: string | null;
}>): Promise<T[]>;
/**
 *  An accounts-SDK indexer status as markets' own shape, field by field.
 *
 * @internal
 */
export declare function toStatus(status: {
    chainId: number;
    indexedBlock: bigint;
    chainHead: bigint;
    behindBy: bigint;
    indexedBlockTime: bigint | undefined;
    lagSeconds: bigint | undefined;
    observedAt: bigint;
    ready: boolean;
}): AccountsIndexerStatus;
/**
 *  Run accounts-indexer reads over `chainIds`, boundary-normalized.
 *
 *  **Details**
 *
 *  The accounts SDK owns its indexer URLs; nothing here passes one. The
 *  chains are ALWAYS passed explicitly — the accounts SDK's process-wide
 *  default is never relied on, so the chains a read covers belong to the
 *  owner that made it. A chain whose indexer was turned off with the accounts
 *  SDK's `configureIndexer` is refused before any request.
 *
 * @internal
 */
export declare function indexedRead<T>(operation: string, chainIds: readonly number[], run: (scope: {
    chainIds: readonly number[];
}) => Promise<T>): Promise<T>;
/**
 *  Bind the smart-accounts capability to a markets client's chain transport.
 *
 *  **Gotchas**
 *
 *  NOT exported: `client.accounts` is the only door, built lazily. The chain
 *  gate runs per member rather than at construction, so a client on an
 *  uncovered chain (a local anvil) still constructs and every other
 *  capability keeps working.
 *
 * @internal
 */
export declare function createSmartAccountsWithDeps(deps: SmartAccountsDeps): SmartAccountsClient;
export {};
