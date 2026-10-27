import { type Address, type Client } from "viem";
/**
 *  Whether an address has code, or `undefined` when the read did not answer.
 *
 *  **Exported because the tri-state is the point, and a consumer rebuilding it gets it wrong.**
 *  `getCode` throwing and `getCode` returning nothing are different facts: the first means the
 *  chain did not answer, the second means the address is empty. Collapsing them renders a funded,
 *  existing account as "not there" — which is what a caller writing `catch { return false }`
 *  produces, and it is a claim about somebody's money made from an RPC hiccup.
 *
 *  @param client Any viem client that can read.
 *  @param address The address to check.
 *  @returns `true` with code, `false` without, `undefined` when the read failed.
 */
export declare function hasCode(client: Client, address: Address): Promise<boolean | undefined>;
/** One candidate account under an accountId. */
export type AccountSlot = {
    /** Which position under the scan's {@link AccountScan.accountId} this is. */
    readonly index: bigint;
    /** The address, derived offline. Correct whether or not anything is deployed there. */
    readonly address: Address;
    /**
     *  `true` when code is present, `false` when the address is empty, `undefined` when the read
     *  did not answer.
     *
     *  All three are distinct product states. An empty slot is not an error — the address is real
     *  and funds can arrive at it before the account exists, which is the whole point of a
     *  derivation. An unanswered read is not an empty slot.
     */
    readonly deployed: boolean | undefined;
};
/** The result of scanning one accountId's indices. */
export type AccountScan = {
    readonly accountId: Address;
    readonly slots: readonly AccountSlot[];
    /**
     *  Exactly the indices this scan looked at, in order.
     *
     *  **The honest field, and the one to render from.** The index space is `uint256`, the factory
     *  counts nothing, and `eth_getLogs` cannot enumerate on this chain — so a scan can never prove
     *  absence, and a UI that says "no accounts" when it means "none in the indices I checked" is
     *  wrong in the direction that hides funds.
     *
     *  It is a list rather than a bound because a scan need not start at zero or be contiguous: a
     *  dapp that namespaces its accounts at 10000 is served by asking for exactly those.
     */
    readonly indices: readonly bigint[];
    /**
     *  The highest index looked at.
     *
     *  True of any scan, but it implies a contiguous range from zero only for {@link accountsOf}.
     *  Use {@link describeCoverage} to say what was checked rather than inferring it from here.
     */
    readonly maxIndex: bigint;
    /** How many `eth_getCode` calls this cost. */
    readonly requests: number;
};
/**
 *  Every account `accountId` could have, up to `maxIndex`, and which of them exist.
 *
 *  The derivation is offline, so the addresses are known before any request is made; the requests
 *  only establish which are deployed. That ordering matters for a UI: the list can render
 *  immediately with every address correct and fill in existence as the reads land.
 *
 *  `maxIndex` is a scan bound, not a property of the factory. The factory reserves nothing and
 *  counts nothing — index 7 is simply the eighth address that accountId may occupy — so a scan
 *  can always be wrong about "no more accounts" and the caller should say "none in the first N"
 *  rather than "none".
 */
export declare function accountsOf(client: Client, chainId: number, accountId: Address, options?: {
    maxIndex?: bigint;
    concurrency?: number;
    saltVersion?: string;
}): Promise<AccountScan>;
/**
 *  How many indices one call may ask about.
 *
 *  Each index is an `eth_getCode`, so a range is a request count with a different name. The cap is
 *  here rather than in the caller because the mistake it prevents — `accountsInRange(0n, 2n**32n)`
 *  from a typo — does not fail, it hangs, and then rate-limits everything else the app is doing.
 *
 *  Exported because a caller that pages a wide scan has to know where to cut, and the alternative
 *  is a `1000` written down a second time in the consumer.
 */
export declare const MAX_SCAN_WIDTH = 1000n;
/** A contiguous span of indices. */
export interface IndexRange {
    /** The first index, inclusive. */
    readonly from: bigint;
    /** How many indices. */
    readonly count: bigint;
}
/**
 *  The indices a range covers.
 *
 *  @param range The span.
 *  @returns Each index, in order.
 *  @throws {InvalidInputError} When the span is empty or wider than {@link MAX_SCAN_WIDTH}.
 */
export declare function rangeIndices(range: IndexRange): readonly bigint[];
/**
 *  Which of `accountId`'s accounts exist, at exactly the indices you name.
 *
 *  **The general form**, and the one a dapp with its own index namespace wants: an account at
 *  index 10000 is invisible to {@link accountsOf}, which walks up from zero, and no amount of
 *  scanning finds it without being told where to look. There is no way around that — the index
 *  space is `uint256` and nothing on chain enumerates it — so the API takes the answer rather than
 *  pretending to search for it.
 *
 *  Duplicates are collapsed and order is preserved, so a caller can pass a list assembled from
 *  several sources without deduplicating first.
 *
 *  @param client Any viem client that can read.
 *  @param chainId EIP-155 chain id.
 *  @param accountId The owner — a key, or an account when these are its sub-accounts.
 *  @param indices The indices to check.
 *  @param options.concurrency How many reads in flight.
 *  @param options.saltVersion Which salt version, when a chain has more than one committed.
 *  @returns One slot per index, in the order given.
 *  @throws {InvalidInputError} When more than {@link MAX_SCAN_WIDTH} indices are asked for at once.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 */
export declare function accountsAt(client: Client, chainId: number, accountId: Address, indices: readonly bigint[], options?: {
    concurrency?: number;
    saltVersion?: string;
}): Promise<AccountScan>;
/**
 *  Which of `accountId`'s accounts exist, across a contiguous span.
 *
 *  The shape a namespace takes: a dapp that puts a user's main account at 10000 and its
 *  sub-accounts at 10001 upward asks for `{from: 10000n, count: 16n}` and gets the whole family.
 *
 *  @param client Any viem client that can read.
 *  @param chainId EIP-155 chain id.
 *  @param accountId The owner.
 *  @param range The span.
 *  @param options As {@link accountsAt}.
 *  @returns The scan.
 *  @throws {InvalidInputError} When the span is empty or wider than the cap.
 */
export declare function accountsInRange(client: Client, chainId: number, accountId: Address, range: IndexRange, options?: {
    concurrency?: number;
    saltVersion?: string;
}): Promise<AccountScan>;
/**
 *  The lowest index in a scan with nothing at it.
 *
 *  Falls back to one past the highest index seen rather than to zero. If every slot in the scanned
 *  set exists, zero is the one index guaranteed to be taken, and suggesting it would put an
 *  already-used address in front of someone about to create an account.
 *
 *  **A slot whose existence is unknown is not free.** Suggesting an index because a read failed is
 *  how two people end up fighting over one address — and the factory is idempotent, so the second
 *  creator does not get an error, they silently get the first one's account.
 *
 *  @param scan A scan, or the slots out of one. Both are accepted because everything else in this
 *         module takes and returns an {@link AccountScan}, and being the one function that wanted
 *         `scan.slots` instead was a papercut a consumer hit rather than a distinction worth
 *         keeping. Anything carrying an index and a tri-state existence still satisfies it.
 *  @returns The index to offer.
 */
export declare function firstFreeIndex(scan: AccountScan | readonly {
    readonly index: bigint;
    readonly deployed: boolean | undefined;
}[]): bigint;
/**
 *  The next index with nothing at it, read from the chain.
 *
 *  What a caller almost always wants when they did not name an index: "give me another account".
 *  {@link firstFreeIndex} is the rule; this is the rule plus the read, so a consumer does not have
 *  to remember to do both — and, more importantly, does not get to skip the read and guess.
 *
 *  Starts from `from`, so an application with its own namespace asks for the next free one *in its
 *  namespace* rather than the next free one overall.
 *
 *  @param client Any viem client that can read.
 *  @param chainId EIP-155 chain id.
 *  @param accountId The owner — a key, or an account when these are its sub-accounts.
 *  @param options.from Where to start looking. Defaults to zero.
 *  @param options.width How many indices to consider. Defaults to the gap limit.
 *  @param options.concurrency How many reads in flight.
 *  @param options.saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The index to create at.
 *  @throws {RpcError} When no read answered, because then nothing was learned and every index in the
 *          window is equally unknown — returning one would hand out an index that may be taken,
 *          and the factory is idempotent, so the caller would silently get somebody else's
 *          account rather than an error.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 */
export declare function nextFreeIndex(client: Client, chainId: number, accountId: Address, options?: {
    from?: bigint;
    width?: bigint;
    concurrency?: number;
    saltVersion?: string;
}): Promise<bigint>;
/**
 *  What a scan actually covered, as a sentence.
 *
 *  Exists so a UI never has to infer coverage from `maxIndex`, which reads as "0 through N" and is
 *  only that for {@link accountsOf}. Saying "none in the indices I checked" is the whole difference
 *  between an honest empty state and one that hides an account.
 *
 *  @param scan The scan.
 *  @returns A phrase like `indices 0–19` or `12 indices from 10000`.
 */
export declare function describeCoverage(scan: AccountScan): string;
/** What kind of thing an owner is. */
export type OwnerKind = "key" | "account" | "unknown";
/** One owner of an account, and whether it is itself an account. */
export type OwnerInfo = {
    readonly address: Address;
    /**
     *  `key` when the address has no code, so only a private key can sign for it.
     *
     *  `account` when it has code AND answers `getOwners()`. That second half is what makes the
     *  distinction trustworthy: any contract can have code, but one that answers `getOwners()` is a
     *  Safe, and a Safe can sign for another Safe through EIP-1271. So this is not cosmetic — it
     *  decides whether authority over this account terminates here or continues upward.
     *
     *  `unknown` when a read did not answer.
     */
    readonly kind: OwnerKind;
};
/** An account's owner set, as read from chain. */
export type OwnerSet = {
    readonly account: Address;
    readonly owners: readonly OwnerInfo[];
    readonly threshold: bigint;
    readonly requests: number;
};
/**
 *  Who controls `account`, and which of those are themselves accounts.
 *
 *  A Safe owned by a Safe is not a hypothetical: `createAccount` takes any address, including one
 *  of our own accounts, and the resulting child is fully operable — proven on Somnia testnet to
 *  three levels, moved by a single EOA signature. So "is this owner a key or an account" is a
 *  question the UI has to be able to answer, and it is answerable on chain.
 */
export declare function ownersOf(client: Client, account: Address): Promise<OwnerSet>;
/** One step up the chain of control. */
export type CustodyStep = {
    readonly account: Address;
    readonly owners: readonly OwnerInfo[];
    readonly threshold: bigint;
    /** How far above the account this step is. 0 is the account itself. */
    readonly depth: number;
};
/** Where authority over an account ultimately rests. */
export type CustodyChain = {
    readonly account: Address;
    readonly steps: readonly CustodyStep[];
    /** Every address at the top of the chain that only a private key can sign for. */
    readonly keys: readonly Address[];
    /**
     *  `true` when every branch was followed to something with no code.
     *
     *  `false` means the walk stopped early — depth or budget ran out, or a read did not answer — so
     *  `keys` is incomplete and must not be presented as the full set. An account whose custody is
     *  partly unknown is a different statement from one that ends in a key you hold.
     */
    readonly complete: boolean;
    readonly requests: number;
};
/**
 *  Walk owners upward until every branch ends at something with no code.
 *
 *  This answers the question no other product asks: an account owned by another account **can
 *  only act while its parent can**. If the parent's keys are lost, the child is stranded — its
 *  funds stay visible and nobody can move them. There is no recovery path in the contracts, so the
 *  chain of custody is not a detail, it is the account's most important property.
 *
 *  Cycles are possible in principle (A owns B, B owns A) and would be unusable but deployable, so
 *  visited addresses are tracked rather than assumed away.
 */
export declare function custodyChain(client: Client, account: Address, options?: {
    maxDepth?: number;
    maxRequests?: number;
}): Promise<CustodyChain>;
/** An account in a tree, with the accounts derived under it. */
export type TreeNode = {
    readonly address: Address;
    /** `undefined` for the root when it is a key rather than an account. */
    readonly index: bigint | undefined;
    readonly deployed: boolean | undefined;
    readonly children: readonly TreeNode[];
};
/** Everything reachable downward from one address. */
export type AccountTree = {
    readonly root: Address;
    readonly nodes: readonly TreeNode[];
    /** `false` when depth or budget stopped the scan, so the tree may be missing accounts. */
    readonly complete: boolean;
    readonly requests: number;
};
/**
 *  Every account derived from `root`, and every account derived from those, recursively.
 *
 *  `root` may be a key or an account — the derivation does not care, which is exactly why nesting
 *  works at all. Because an account can be an accountId, the set of a user's accounts is a tree
 *  rather than a list, and a user who created one by hand will have one whether or not the app
 *  offers it. So this scans downward by default rather than treating nesting as an advanced view.
 *
 *  Bounded by a request budget, not only by depth, because the cost is multiplicative: each
 *  deployed account adds another `maxIndex + 1` reads. `complete` says whether the budget held.
 */
export declare function accountTree(client: Client, chainId: number, root: Address, options?: {
    maxIndex?: bigint;
    /**
     *  Exactly which indices to look at, at EVERY level, instead of walking up from zero.
     *
     *  Without this the tree inherits the gap-limit scan the whole way down, so an application
     *  that puts its accounts at 10001 is invisible in the tree even when the flat scan finds
     *  them — which is a worse failure than not finding them at all, because the tree looks
     *  complete.
     */
    indices?: readonly bigint[];
    maxDepth?: number;
    maxRequests?: number;
    concurrency?: number;
    saltVersion?: string;
}): Promise<AccountTree>;
/** One chain's view of an account. */
export type ChainSetup = {
    readonly chainId: number;
    readonly deployed: boolean | undefined;
    /** `undefined` when not deployed there, or when the read did not answer. */
    readonly owners: readonly Address[] | undefined;
    readonly threshold: bigint | undefined;
};
/**
 *  The same address, seen from every chain the factory reaches.
 *
 *  The address is identical on all three by construction, so this is not "find the account on each
 *  chain" — it is "is it deployed there, and does it have the same owners". Those can differ:
 *  ownership is per-chain state, and an owner added on one chain is not added on the others.
 */
export declare function setupsAcrossChains(clients: readonly {
    client: Client;
    chainId: number;
}[], account: Address): Promise<readonly ChainSetup[]>;
/**
 *  The owner set and threshold shared by every chain the account is deployed on, or `undefined`
 *  when they disagree.
 *
 *  Chains where the account is not deployed are excluded rather than counted as different: an
 *  address with no code has no owner set to disagree with, and treating absence as divergence
 *  would report every partially-deployed account as inconsistent.
 */
export declare function sharedSetup(setups: readonly ChainSetup[]): {
    owners: readonly Address[];
    threshold: bigint;
} | undefined;
/**
 *  Which chains differ from the one the caller is standing on.
 *
 *  Deliberately relative rather than an abstract diff, because that is what a user can act on: an
 *  owner change is a transaction on one chain and affects only that chain, so "these two differ
 *  from where you are" tells them what to fix and an unanchored set difference does not.
 */
export declare function deviatingSetups(setups: readonly ChainSetup[], chainId: number): readonly ChainSetup[];
/**
 *  One index, seen from every chain that was scanned.
 *
 *  The three chain lists are the three states {@link AccountSlot.deployed} distinguishes, kept
 *  apart rather than collapsed into a boolean. `inconclusiveOn` is the one that matters: a chain
 *  whose read did not answer is not a chain where the account is absent, so `deployedOn` is a
 *  lower bound whenever that list is non-empty.
 */
export type CrossChainSlot = {
    /** Which position under the owner this is. */
    readonly index: bigint;
    /** The address. Identical on every chain — see {@link scanAcrossChains}. */
    readonly address: Address;
    /** Chains where code is present. */
    readonly deployedOn: readonly number[];
    /** Chains where the address is empty. The address is still real, and can still hold funds. */
    readonly emptyOn: readonly number[];
    /** Chains whose read did not answer. Nothing was learned about those. */
    readonly inconclusiveOn: readonly number[];
};
/** What {@link scanAcrossChains} found. */
export type CrossChainScan = {
    readonly accountId: Address;
    /** One entry per index looked at, in the order they were looked at. */
    readonly slots: readonly CrossChainSlot[];
    /** Exactly the indices this scan covered. See {@link AccountScan.indices} for why it is a list. */
    readonly indices: readonly bigint[];
    /** The chains that were scanned, in the order given. */
    readonly chainIds: readonly number[];
    /** Each chain's own scan, for a caller that wants the detail rather than the union. */
    readonly perChain: readonly {
        readonly chainId: number;
        readonly scan: AccountScan;
    }[];
};
/**
 *  Scan one owner's accounts on several chains at once.
 *
 *  **The sibling of {@link setupsAcrossChains}, for the step before it.** `setupsAcrossChains`
 *  answers "who owns this account, per chain" for an address you already have; this answers "which
 *  of this owner's accounts exist, anywhere" and hands back the union. Every wallet-shaped consumer
 *  was writing that loop — scan n chains, union the deployed indices, take the address out of
 *  whichever slot answered — and the union is the part that is easy to get subtly wrong.
 *
 *  **Why the address is one field and not one per chain.** An account's address is derived from
 *  the factory's address and `(accountId, index)` alone, and the factory sits at the same address
 *  on every chain it is deployed to, so the derivation is chain-independent by construction. This
 *  asserts it rather than assuming it: a chain running a factory at a different address would make
 *  a cross-chain union meaningless, and that is worth a loud failure rather than a quiet one.
 *
 *  Every chain is scanned for the SAME indices, so the slots line up and the union is exact.
 *
 *  @param clients One viem client per chain, each with the chain id it is connected to.
 *  @param accountId The owner the addresses derive from.
 *  @param options `maxIndex` bounds the scan the way {@link accountsOf} does; `indices` names them
 *         explicitly instead, the way {@link accountsAt} does. `concurrency` and `saltVersion` are
 *         passed through to each chain's scan.
 *  @returns The union, and each chain's own scan.
 *  @throws {InvalidInputError} When `clients` is empty, when the index list is empty or too wide,
 *          or when two chains derive different addresses for one index.
 *  @throws {UnsupportedChainError} When a chain has no committed deployment.
 */
export declare function scanAcrossChains(clients: readonly {
    client: Client;
    chainId: number;
}[], accountId: Address, options?: {
    maxIndex?: bigint;
    indices?: readonly bigint[];
    concurrency?: number;
    saltVersion?: string;
}): Promise<CrossChainScan>;
//# sourceMappingURL=discovery.d.ts.map