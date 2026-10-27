import { type Address } from "viem";
/**
 *  The per-call override every read accepts.
 *
 *  Omit it and the read covers the chains set with `configureIndexer` — every chain we index,
 *  unless configured otherwise.
 */
export type ChainScope = {
    /**
     *  The chains to read. **Always named, never guessed:** our accounts are CREATE3 and share an
     *  address across chains, so every row says which chain it came from.
     */
    readonly chainIds?: readonly number[];
};
/** How an execution's parameters were recovered, or why they could not be. */
export type ExecutionContent = "Calldata" | "Unavailable";
/**
 *  Every kind of thing that can happen to an account.
 *
 *  A union rather than `string`, because these are a GraphQL **enum** on the wire: Hasura types
 *  the column as `accounteventkind`, so a value has to be an unquoted identifier and a typo is a
 *  query error rather than an empty result. Pinning the list here makes a wrong one a compile
 *  error instead.
 */
export type AccountEventKind = "Created" | "CreationSkipped" | "OwnersAuthorized" | "Setup" | "OwnerAdded" | "OwnerRemoved" | "ThresholdChanged" | "Executed" | "ExecutionFailed" | "ModuleExecuted" | "ModuleExecutionFailed" | "ModuleEnabled" | "ModuleDisabled" | "GuardChanged" | "ModuleGuardChanged" | "FallbackHandlerChanged" | "HashApproved" | "MessageSigned" | "NativeReceived" | "SingletonChanged" | "ContractDeployed";
/**
 *  Everything the index knows about one Safe.
 *
 *  **Only accounts `SomniaAccountFactory` made.** The index watches more than that — the Safes of
 *  other estates, deliberately, so a multisig control plane can read them — but this SDK is about
 *  THIS system's accounts, and mixing a foreign Safe into an answer about them would make every
 *  caller carry a distinction it never asked for. Every read filters on it, so `derivation` is
 *  always there and there is no "which kind is this" branch to write.
 */
export type IndexedAccount = {
    /**
     *  The chain this row came from.
     *
     *  Always present, never inferred from which endpoint was asked: one endpoint serves several
     *  chains, and the same address is a different Safe on each.
     */
    readonly chainId: number;
    readonly address: Address;
    /** The first block the indexer saw anything from this Safe. Not necessarily its deployment. */
    readonly firstSeenBlock: bigint;
    readonly firstSeenTimestamp: bigint;
    /** The singleton it delegates to, read from storage slot 0. */
    readonly singleton: Address | undefined;
    /** `VERSION()` on that singleton, e.g. `"1.5.0"`. */
    readonly version: string | undefined;
    readonly threshold: bigint;
    readonly ownerCount: number;
    readonly moduleCount: number;
    readonly fallbackHandler: Address | undefined;
    readonly guard: Address | undefined;
    readonly moduleGuard: Address | undefined;
    readonly executionCount: bigint;
    readonly failedExecutionCount: bigint;
    readonly lastActivityTimestamp: bigint | undefined;
    /**
     *  Whose account it is, at what index, and who paid.
     *
     *  **Never undefined**, because this SDK only ever returns accounts our factory made — see the
     *  note on `IndexedAccount`. Reading it needs no branch.
     */
    readonly derivation: AccountDerivation;
};
/** The `(accountId, index)` an account's address was derived from. Factory accounts only. */
export type AccountDerivation = {
    /** The owner the address derives from — and, for a sub-account, the parent account. */
    readonly accountId: Address;
    readonly index: bigint;
    /** Who paid for the deployment. Need not be the owner: creating an account is sponsored often. */
    readonly deployer: Address;
    readonly createdAtBlock: bigint;
    readonly createdAtTimestamp: bigint;
    /** The EIP-712 digest that authorised it, or `undefined` for a plain `createAccount`. */
    readonly authorization: `0x${string}` | undefined;
    /**
     *  Whether `accountId` is still one of the account's owners.
     *
     *  **The false case is the one worth rendering.** An address derives from `accountId` forever,
     *  but the Safe can remove it like any other owner — and then the key that names this address
     *  can no longer move anything in it.
     */
    readonly accountIdIsOwner: boolean;
};
/** One thing that happened to an account. */
export type AccountEvent = {
    /**
     *  The chain this row came from.
     *
     *  Always present, never inferred from which endpoint was asked: one endpoint serves several
     *  chains, and the same address is a different Safe on each.
     */
    readonly chainId: number;
    readonly id: string;
    readonly account: Address;
    readonly kind: AccountEventKind;
    readonly subject: Address | undefined;
    readonly value: bigint | undefined;
    readonly digest: `0x${string}` | undefined;
    readonly success: boolean | undefined;
    readonly blockNumber: bigint;
    readonly timestamp: bigint;
    readonly logIndex: number;
    readonly txHash: `0x${string}`;
    /** The EOA that sent the transaction, and therefore paid. No Safe event carries it. */
    readonly submitter: Address | undefined;
    /** What the transaction did, on execution kinds. See {@link ExecutionDetail}. */
    readonly execution: ExecutionDetail | undefined;
};
/**
 *  What an executed transaction actually did.
 *
 *  Recovered from the calldata of the transaction that called the Safe, because the deployed
 *  singleton emits none of it — `ExecutionSuccess` carries a hash and a refund and nothing else.
 *  `content: "Unavailable"` means the outer transaction was not the `execTransaction`, so only a
 *  trace could reach the parameters. That is reported rather than rendered as an empty call.
 */
export type ExecutionDetail = {
    readonly content: ExecutionContent;
    readonly to: Address | undefined;
    readonly value: bigint | undefined;
    /** `0` call, `1` delegatecall. A delegatecall runs foreign code with this account's authority. */
    readonly operation: number | undefined;
    readonly data: `0x${string}` | undefined;
    readonly selector: `0x${string}` | undefined;
    /** The nonce this execution consumed — what matches it to the proposal that claimed the slot. */
    readonly nonce: bigint | undefined;
};
/** An owner of an account, now or formerly. */
export type IndexedOwner = {
    /**
     *  The chain this row came from.
     *
     *  Always present, never inferred from which endpoint was asked: one endpoint serves several
     *  chains, and the same address is a different Safe on each.
     */
    readonly chainId: number;
    readonly account: Address;
    readonly owner: Address;
    readonly active: boolean;
    readonly addedAtBlock: bigint;
    readonly addedAtTimestamp: bigint;
    readonly removedAtBlock: bigint | undefined;
};
/**
 *  How far behind the index is.
 *
 *  Returned alongside data rather than on request, so a caller has no way to render a number
 *  without also holding the fact that it might be stale.
 */
export type IndexerStatus = {
    readonly chainId: number;
    /** The last block whose events are in the index. */
    readonly indexedBlock: bigint;
    /** The chain head the indexer has seen. */
    readonly chainHead: bigint;
    /** `chainHead - indexedBlock`. Zero when caught up. */
    readonly behindBy: bigint;
    /** When the last indexed block was produced (unix seconds), when the index says. */
    readonly indexedBlockTime: bigint | undefined;
    /**
     *  How old the newest indexed block is, in seconds, as of `observedAt`.
     *
     *  The lag a person understands: "as of 40 seconds ago" says more than a block count on a chain
     *  that makes ten a second. `undefined` when the index does not report its block times.
     */
    readonly lagSeconds: bigint | undefined;
    /** When this was measured, on this machine's clock (unix seconds). */
    readonly observedAt: bigint;
    /**
     *  Whether the index has caught up at least once since it was last (re)built. `false` during a
     *  backfill — when every count it reports is a count so far.
     */
    readonly ready: boolean;
};
/**
 *  One page of a feed, and where to continue.
 *
 *  The same shape the markets SDK uses for its feeds, so a consumer of both writes one loop.
 */
export type Page<T> = {
    readonly items: readonly T[];
    /**
     *  Pass back as `cursor` for the next page; `null` when the feed is drained.
     *
     *  **Opaque, and bound to the read that issued it.** It carries a position per chain — feeds
     *  across chains are merged, and each chain is read from where it left off — plus the filter it
     *  belongs to. Passed to a read with a different filter, it is refused rather than quietly
     *  starting somewhere wrong.
     */
    readonly nextCursor: string | null;
};
/** What every paged read takes. */
export type PageOptions = ChainScope & {
    /** Items per page. Default 50, at most 1000. */
    readonly limit?: number;
    /** A `nextCursor` from the previous page of the same read. Omit for the first page. */
    readonly cursor?: string;
};
/** The factory on one chain, as the index last saw it. */
export type FactoryState = {
    readonly chainId: number;
    readonly address: Address;
    /** The admin. It can point new accounts at a different Safe, and upgrade the factory. */
    readonly owner: Address | undefined;
    /** The UUPS implementation behind the proxy. */
    readonly implementation: Address | undefined;
    /** The Safe singleton NEW accounts are deployed against. */
    readonly safeSingleton: Address | undefined;
    /** The fallback handler NEW accounts are set up with. */
    readonly fallbackHandler: Address | undefined;
    /** Every account this factory ever deployed. Exact — a counter the index keeps, not a scan. */
    readonly accountCount: bigint;
    /** Batch indices skipped because the account already existed. */
    readonly creationSkipCount: bigint;
    readonly updatedAtBlock: bigint;
    readonly updatedAtTimestamp: bigint;
};
/** Every kind of thing that can happen to the factory itself. */
export type FactoryEventKind = "Initialized" | "ImplementationSet" | "Upgraded" | "OwnershipTransferred" | "DomainChanged";
/** One thing that happened to the factory. */
export type FactoryEvent = {
    readonly chainId: number;
    readonly id: string;
    readonly kind: FactoryEventKind;
    /**
     *  `ImplementationSet`: the new singleton. `Upgraded`: the new implementation.
     *  `OwnershipTransferred`: the new owner.
     */
    readonly subject: Address | undefined;
    /** `ImplementationSet`: the new fallback handler. `OwnershipTransferred`: the previous owner. */
    readonly secondary: Address | undefined;
    /** `Initialized`: the initializer version. */
    readonly value: bigint | undefined;
    readonly blockNumber: bigint;
    readonly timestamp: bigint;
    readonly logIndex: number;
    readonly txHash: `0x${string}`;
    readonly submitter: Address | undefined;
};
/**
 *  The signed authorization an account was created from: what the owner agreed to.
 *
 *  Only accounts made by `createAccountWithOwners` have one. The terms matter because the factory
 *  cannot displace the signer but can seat somebody beside them — `additionalOwners` is exactly
 *  who the signature let in.
 */
export type IndexedAuthorization = {
    readonly chainId: number;
    readonly account: Address;
    /** The EIP-712 digest that was signed. Shared by every account one authorization created. */
    readonly digest: `0x${string}`;
    /** The signer, which is also the owner the address derives from. */
    readonly accountId: Address;
    /** Owners granted alongside the signer, in the order given. */
    readonly additionalOwners: readonly Address[];
    readonly threshold: bigint;
    /** The last timestamp the authorization was usable at. */
    readonly deadline: bigint;
    readonly blockNumber: bigint;
    readonly timestamp: bigint;
    readonly txHash: `0x${string}`;
};
/** A module an account enabled — signature-free authority over it — now or formerly. */
export type IndexedModule = {
    readonly chainId: number;
    readonly account: Address;
    readonly module: Address;
    readonly enabled: boolean;
    readonly enabledAtBlock: bigint;
    readonly enabledAtTimestamp: bigint;
    readonly disabledAtBlock: bigint | undefined;
};
/**
 *  The account at an address, on each chain that has one — the reverse lookup.
 *
 *  **This is the reason the indexer exists.** Given an address, the derivation cannot tell you
 *  whose account it is: `keccak256(accountId, index)` does not invert. Only an index that watched
 *  the creation can answer. One entry per chain that has the account, because the same address is
 *  a different Safe on each; empty when none has.
 *
 *  @param address The address to look up.
 *  @param options `chainIds` overrides the configured chains.
 */
export declare function listAccountsAt(address: string, options?: ChainScope): Promise<readonly IndexedAccount[]>;
/**
 *  Accounts, newest first — every one our factory made, those derived from one key or account, or
 *  those an address can act on.
 *
 *  - **Neither filter:** the factory's whole output, newest first — what a front page lists.
 *  - **`derivedFrom`:** everything created under that key **or account**. The sub-account tree is
 *    the same column, so an account's address lists its children, at any number — the answer a
 *    scan from zero can never give: the index space is `uint256` and nothing on chain enumerates it.
 *  - **`controlledBy`:** every account the address is an owner of, newest arrival first. **Not the
 *    same question as `derivedFrom`:** the salt names `accountId` alone, so an owner added after
 *    creation is invisible to every derivation — and an `accountId` since removed is still in the
 *    address forever. Current owners only, unless `includeFormer`.
 *
 *  @throws {InvalidInputError} When both filters are given — they are different questions.
 */
export declare function getAccountsPage(options?: PageOptions & {
    readonly derivedFrom?: string;
    readonly controlledBy?: string;
    /** With `controlledBy`: also accounts it used to own. Default `false`. */
    readonly includeFormer?: boolean;
}): Promise<Page<IndexedAccount>>;
/** Every owner of an account, oldest arrival first. Former owners with `includeFormer`. */
export declare function listOwners(account: string, options?: ChainScope & {
    readonly includeFormer?: boolean;
}): Promise<readonly IndexedOwner[]>;
/**
 *  Every module an account has enabled, oldest first. Former ones with `includeFormer`.
 *
 *  A module acts without any owner signature, so this list is part of who controls the account —
 *  and a module enabled and later disabled is history a reader auditing it needs to see.
 */
export declare function listModules(account: string, options?: ChainScope & {
    readonly includeFormer?: boolean;
}): Promise<readonly IndexedModule[]>;
/**
 *  The signed authorization an account was created from, per chain — empty when it was created by
 *  a plain `createAccount`, which leaves nothing signed behind.
 */
export declare function listAuthorizations(account: string, options?: ChainScope): Promise<readonly IndexedAuthorization[]>;
/**
 *  One page of history, newest first — one account's, or every account's.
 *
 *  With `account`, what happened to it. Without, everything that happened to any account our
 *  factory made: the network's activity, for a front page. Across chains the pages merge by time,
 *  and each chain resumes from its own position (see `Page.nextCursor`).
 *
 *  Within a chain the order is `(blockNumber, logIndex)`. **Not timestamp**, which ties — creation
 *  and setup always share a block — and not `id`, a string that sorts block 9,999,999 after
 *  10,000,000.
 */
export declare function getActivityPage(options?: PageOptions & {
    readonly account?: string;
    readonly kinds?: readonly AccountEventKind[];
}): Promise<Page<AccountEvent>>;
/**
 *  The factory on each chain: who administers it, what new accounts get, and how many it made.
 *
 *  `accountCount` is exact — a counter the index maintains on every creation — so a front page can
 *  say "N accounts" without scanning anything.
 */
export declare function listFactories(options?: ChainScope): Promise<readonly FactoryState[]>;
/**
 *  The factory's own lifecycle, newest first: initialisation, upgrades, admin changes, and the
 *  moments new accounts started getting a different Safe — or every unspent authorization stopped
 *  verifying (`DomainChanged`).
 */
export declare function getFactoryHistoryPage(options?: PageOptions & {
    readonly kinds?: readonly FactoryEventKind[];
}): Promise<Page<FactoryEvent>>;
/**
 *  How far behind the index is on each chain, in the order asked.
 *
 *  **Ask before rendering anything that can go stale.** An owner set drawn from a lagging index is
 *  a claim about who can move somebody's money, made from data that was true hours ago.
 */
export declare function getIndexerStatus(options?: ChainScope): Promise<readonly IndexerStatus[]>;
//# sourceMappingURL=indexer.d.ts.map