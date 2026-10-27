// Sub-accounts: the vocabulary, and the four things you do with one.
//
// **A sub-account is not a different kind of account, and nothing here is a different mechanism.**
// `createAccount` takes any address as its `accountId`, including one of our own accounts, so a
// sub-account is `createAccount(mainAccount, index)` and the result is an ordinary Safe whose only
// owner is the main account. Every function below is thin over the general one, and says so — the
// point is that "sub-accounts of this account" is findable in the API rather than being a fact you
// have to already know.
//
// Three properties are worth having in mind before using any of it:
//
// 1. **Creating one needs no signature at all.** `createAccount` is permissionless and the owner
//    comes out of the salt, so a sponsor can create somebody's sub-account and cannot create it
//    wrongly. Only naming owners at setup, or changing them afterwards, needs the main account's
//    consent.
// 2. **Consent is per chain.** A main account approves through EIP-1271, which is checked against
//    Safe's own domain — and Safe's domain contains the chain id. So the one-signature-every-chain
//    property `authorization.ts` gives a top-level account does NOT extend to anything a
//    sub-account's owner has to agree to.
// 3. **Balances are not shared.** A sub-account starts empty and stays empty until someone executes
//    a transfer into it. See `transfer.ts`.
import { getAddress } from "viem";
import { accountAuthorizationHash, createAccountWithOwnersCall, } from "./authorization.js";
import { accountsAt, accountsInRange, accountsOf, } from "./discovery.js";
import { approvalHashes, nestThrough, planExecution, readExecutionPlan, } from "./execute.js";
import { accountAddress, createAccountCall, factoryAddress, } from "./factory.js";
import { addOwnerCall, removeOwnerCall } from "./safe.js";
import { present } from "./errors.js";
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
export function subAccountAddress(chainId, mainAccount, index, saltVersion) {
    return accountAddress(chainId, mainAccount, index, saltVersion);
}
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
export function createSubAccountCall(chainId, mainAccount, index, saltVersion) {
    return createAccountCall(chainId, mainAccount, index, saltVersion);
}
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
export async function subAccountsOf(client, chainId, mainAccount, options = {}) {
    return accountsOf(client, chainId, mainAccount, options);
}
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
export async function subAccountsAt(client, chainId, mainAccount, indices, options = {}) {
    return accountsAt(client, chainId, mainAccount, indices, options);
}
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
export async function subAccountsInRange(client, chainId, mainAccount, range, options = {}) {
    return accountsInRange(client, chainId, mainAccount, range, options);
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
export function planSubAccountCreation(args) {
    const mainAccount = getAddress(args.mainAccount);
    const factory = factoryAddress(args.chainId, args.saltVersion);
    const subAccount = subAccountAddress(args.chainId, mainAccount, args.index, args.saltVersion);
    const through = (args.through ?? []).map((parent) => getAddress(parent));
    // One index, in a list of one. The factory takes parallel lists so that several accounts can
    // share a signature, and a sub-account plan deliberately does not use that: the signature here
    // is nested through the main account and its envelope is Safe's, so each level's consent is
    // already per chain — batching would save a round of nesting, not a round of prompts, and
    // `subAccount` is the address the caller asked about.
    const authorization = {
        accountId: mainAccount,
        indices: [args.index],
        accounts: [subAccount],
        additionalOwners: args.additionalOwners.map((owner) => getAddress(owner)),
        threshold: args.threshold,
        issuedAt: args.issuedAt,
        deadline: args.deadline,
    };
    const digest = accountAuthorizationHash(factory, authorization);
    // The main account itself contributes an envelope here, unlike an execution: `isValidSignature`
    // wraps what it is asked about, where `execTransaction` checks the transaction hash directly.
    const hashes = approvalHashes(args.chainId, digest, [mainAccount, ...through]);
    const hash = present(hashes[hashes.length - 1], "a hash chain is never empty");
    return {
        chainId: args.chainId,
        mainAccount,
        subAccount,
        factory,
        authorization,
        digest,
        through,
        hashes,
        hash,
        saltVersion: args.saltVersion,
    };
}
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
export function signSubAccountCreation(plan, signature) {
    const signed = {
        factory: plan.factory,
        authorization: plan.authorization,
        // The blob the MAIN account's `isValidSignature` checks. Not wrapped for the main account
        // itself — the factory calls it directly — so the fold covers only what is above it.
        signature: nestThrough(signature, plan.through),
    };
    return createAccountWithOwnersCall(plan.chainId, signed, plan.saltVersion);
}
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
export function planAddSubAccountOwner(args) {
    return planExecution({
        chainId: args.chainId,
        account: args.subAccount,
        calls: [addOwnerCall(args.subAccount, args.owner, args.threshold)],
        nonce: args.nonce,
        through: [getAddress(args.mainAccount), ...(args.through ?? [])],
        ...(args.saltVersion === undefined ? {} : { saltVersion: args.saltVersion }),
    });
}
/**
 *  {@link planAddSubAccountOwner}, reading the sub-account's nonce.
 *
 *  @param client Any viem client that can read.
 *  @param args As {@link planAddSubAccountOwner}, without the nonce.
 *  @returns The plan.
 */
export async function readAddSubAccountOwnerPlan(client, args) {
    return readExecutionPlan(client, {
        chainId: args.chainId,
        account: args.subAccount,
        calls: [addOwnerCall(args.subAccount, args.owner, args.threshold)],
        through: [getAddress(args.mainAccount), ...(args.through ?? [])],
        ...(args.saltVersion === undefined ? {} : { saltVersion: args.saltVersion }),
    });
}
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
export function planRemoveSubAccountOwner(args) {
    return planExecution({
        chainId: args.chainId,
        account: args.subAccount,
        calls: [removeOwnerCall(args.subAccount, args.owners, args.owner, args.threshold)],
        nonce: args.nonce,
        through: [getAddress(args.mainAccount), ...(args.through ?? [])],
        ...(args.saltVersion === undefined ? {} : { saltVersion: args.saltVersion }),
    });
}
//# sourceMappingURL=sub-accounts.js.map