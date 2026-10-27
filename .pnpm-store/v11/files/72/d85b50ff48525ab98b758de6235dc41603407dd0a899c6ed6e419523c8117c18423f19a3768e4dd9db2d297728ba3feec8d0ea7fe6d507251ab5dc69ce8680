import { type Address, type Client, type Hex } from "viem";
import { type AccountAuthorization } from "./authorization.js";
import type { Call } from "./call.js";
import { type AccountScan, type IndexRange } from "./discovery.js";
import { type ExecutionPlan } from "./execute.js";
import { type CreateAccountCall } from "./factory.js";
/**
 *  Where `mainAccount`'s sub-account at `index` lives.
 *
 *  {@link accountAddress} with the main account in the owner position. Named because the question
 *  "what is my sub-account's address" should be answerable without first knowing that a
 *  sub-account is just an account whose owner happens to be an account.
 *
 *  The index namespace is the main account's own: `(mainAccount, 0)` has nothing to do with
 *  `(ownerKey, 0)`, and a sub-account at index 10001 collides with nothing.
 *
 *  @param chainId EIP-155 chain id.
 *  @param mainAccount The owning account.
 *  @param index Which of its sub-accounts.
 *  @param saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The address, deployed or not.
 */
export declare function subAccountAddress(chainId: number, mainAccount: Address, index: bigint, saltVersion?: string): Address;
/**
 *  Create a sub-account. **No signature from anybody.**
 *
 *  The surprising one, and the reason it is spelled out: `createAccount` is permissionless, and
 *  the owner is forced out of the salt rather than taken from the caller. So any funded address
 *  can create a sub-account for any main account, and the result is owned by that main account
 *  alone — a sponsor cannot get it wrong, and a griefer gains nothing but a gas bill.
 *
 *  Use {@link planSubAccountCreation} instead when the sub-account should start with a second
 *  owner, which is the only part of creation that needs consent.
 *
 *  @param chainId EIP-155 chain id.
 *  @param mainAccount The account that will own it.
 *  @param index Which of its sub-accounts.
 *  @param saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The call, with the gas limit it needs.
 */
export declare function createSubAccountCall(chainId: number, mainAccount: Address, index: bigint, saltVersion?: string): CreateAccountCall;
/**
 *  A main account's sub-accounts, scanning up from index 0.
 *
 *  {@link accountsOf} with the main account as the owner. Bounded by the same gap limit, and it
 *  finds nothing a dapp put at 10000 — use {@link subAccountsAt} or {@link subAccountsInRange} for
 *  a namespace.
 *
 *  @param client Any viem client that can read.
 *  @param chainId EIP-155 chain id.
 *  @param mainAccount The owning account.
 *  @param options As {@link accountsOf}.
 *  @returns The scan, carrying which indices it covered.
 */
export declare function subAccountsOf(client: Client, chainId: number, mainAccount: Address, options?: {
    maxIndex?: bigint;
    concurrency?: number;
    saltVersion?: string;
}): Promise<AccountScan>;
/**
 *  A main account's sub-accounts, at exactly the indices you name.
 *
 *  @param client Any viem client that can read.
 *  @param chainId EIP-155 chain id.
 *  @param mainAccount The owning account.
 *  @param indices The indices to check.
 *  @param options As {@link accountsAt}.
 *  @returns The scan.
 */
export declare function subAccountsAt(client: Client, chainId: number, mainAccount: Address, indices: readonly bigint[], options?: {
    concurrency?: number;
    saltVersion?: string;
}): Promise<AccountScan>;
/**
 *  A main account's sub-accounts across a contiguous span — the namespace case.
 *
 *  @param client Any viem client that can read.
 *  @param chainId EIP-155 chain id.
 *  @param mainAccount The owning account.
 *  @param range The span.
 *  @param options As {@link accountsAt}.
 *  @returns The scan.
 */
export declare function subAccountsInRange(client: Client, chainId: number, mainAccount: Address, range: IndexRange, options?: {
    concurrency?: number;
    saltVersion?: string;
}): Promise<AccountScan>;
/**
 *  Everything needed to create a sub-account that starts with a second owner, except the signature.
 *
 *  The one creation path that needs consent, because naming owners is the thing `createAccount`
 *  refuses to let a caller do unauthenticated. The main account authorises it through EIP-1271,
 *  which is why this is per chain: the factory's own digest carries no chain id, but the main
 *  account's approval of it is wrapped in Safe's domain, and Safe's domain does.
 */
export interface SubAccountCreationPlan {
    readonly chainId: number;
    /** The account that will own the sub-account, and whose authority is being used. */
    readonly mainAccount: Address;
    /** Where the sub-account will live. */
    readonly subAccount: Address;
    /** The factory this is bound to. */
    readonly factory: Address;
    /** What is being authorised. */
    readonly authorization: AccountAuthorization;
    /** The factory's own digest — chain-agnostic, and NOT what anybody signs here. */
    readonly digest: Hex;
    /** Accounts above the main account, nearest first. Empty when a key owns it directly. */
    readonly through: readonly Address[];
    /** Every digest in the chain, innermost first. */
    readonly hashes: readonly Hex[];
    /** The one digest the key at the top signs. */
    readonly hash: Hex;
    /** Which salt version this was planned against, carried so signing needs no second argument. */
    readonly saltVersion: string | undefined;
}
/**
 *  Plan a sub-account that starts with a second owner.
 *
 *  **Threshold 1 with two owners means the second key can do everything the main account can,
 *  including removing it.** There is no owner configuration that grants partial authority —
 *  threshold 2 would mean the new key cannot act alone, which defeats the point of adding it.
 *  Restricting a key needs a module and a module guard. So `threshold` is a parameter with no
 *  default: it is a decision, not a setting.
 *
 *  @param args.chainId EIP-155 chain id.
 *  @param args.mainAccount The account that will own the sub-account and authorise this.
 *  @param args.index Which of its sub-accounts.
 *  @param args.additionalOwners The keys to grant alongside the main account.
 *  @param args.threshold How many owners must sign afterwards. Passed deliberately — see above.
 *  @param args.issuedAt Unix seconds, from the caller's clock. Signed, so the factory's window
 *         bounds this message rather than the moment somebody submits it.
 *  @param args.deadline Unix seconds. The factory refuses anything more than its window past
 *         `issuedAt`.
 *  @param args.through Accounts above the main account, nearest first.
 *  @param args.saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The plan.
 */
export declare function planSubAccountCreation(args: {
    chainId: number;
    mainAccount: Address;
    index: bigint;
    additionalOwners: readonly Address[];
    threshold: bigint;
    issuedAt: bigint;
    deadline: bigint;
    through?: readonly Address[];
    saltVersion?: string;
}): SubAccountCreationPlan;
/**
 *  Turn the key's signature into the factory call that creates the sub-account.
 *
 *  The signature must be over {@link SubAccountCreationPlan.hash}, not over `digest` — the factory
 *  checks `digest` against the main account, and the main account checks the wrapped hash against
 *  its own owners.
 *
 *  @param plan The plan the signature was made against.
 *  @param signature The key's 65 bytes over `plan.hash`.
 *  @returns The call to send. Any funded sender may submit it.
 */
export declare function signSubAccountCreation(plan: SubAccountCreationPlan, signature: Hex): Call;
/**
 *  Plan adding an owner to a sub-account that already exists.
 *
 *  The later half of the same decision {@link planSubAccountCreation} makes at setup, and it costs
 *  a Safe transaction rather than a factory call because owner management is `authorized` — only
 *  the account itself may call it, so it goes through its own `execTransaction`, signed by its
 *  owner, which is the main account.
 *
 *  Read {@link planSubAccountCreation}'s note on threshold. It applies identically.
 *
 *  @param args.chainId EIP-155 chain id.
 *  @param args.subAccount The sub-account gaining an owner.
 *  @param args.mainAccount Its owner, whose authority signs.
 *  @param args.owner The address to add.
 *  @param args.threshold The threshold afterwards.
 *  @param args.nonce The sub-account's current nonce.
 *  @param args.through Accounts above the main account, nearest first.
 *  @param args.saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The plan.
 */
export declare function planAddSubAccountOwner(args: {
    chainId: number;
    subAccount: Address;
    mainAccount: Address;
    owner: Address;
    threshold: bigint;
    nonce: bigint;
    through?: readonly Address[];
    saltVersion?: string;
}): ExecutionPlan;
/**
 *  {@link planAddSubAccountOwner}, reading the sub-account's nonce.
 *
 *  @param client Any viem client that can read.
 *  @param args As {@link planAddSubAccountOwner}, without the nonce.
 *  @returns The plan.
 */
export declare function readAddSubAccountOwnerPlan(client: Client, args: {
    chainId: number;
    subAccount: Address;
    mainAccount: Address;
    owner: Address;
    threshold: bigint;
    through?: readonly Address[];
    saltVersion?: string;
}): Promise<ExecutionPlan>;
/**
 *  Plan removing an owner from a sub-account.
 *
 *  The revocation half, and the reason a second owner is survivable: a key that leaked stops being
 *  able to act. Takes the owner LIST rather than a `prevOwner`, because Safe stores owners as a
 *  circular linked list and the sentinel case is the one that gets guessed wrong.
 *
 *  @param args.chainId EIP-155 chain id.
 *  @param args.subAccount The sub-account.
 *  @param args.mainAccount Its owner, whose authority signs.
 *  @param args.owners The sub-account's owners, in `getOwners()` order.
 *  @param args.owner The owner to remove.
 *  @param args.threshold The threshold afterwards.
 *  @param args.nonce The sub-account's current nonce.
 *  @param args.through Accounts above the main account, nearest first.
 *  @param args.saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The plan.
 *  @throws {NotAnOwnerError} When `owner` is not in `owners`.
 */
export declare function planRemoveSubAccountOwner(args: {
    chainId: number;
    subAccount: Address;
    mainAccount: Address;
    owners: readonly Address[];
    owner: Address;
    threshold: bigint;
    nonce: bigint;
    through?: readonly Address[];
    saltVersion?: string;
}): ExecutionPlan;
//# sourceMappingURL=sub-accounts.d.ts.map