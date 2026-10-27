import { type Address, type Client } from "viem";
/**
 *  How an account is configured, beyond who owns it.
 *
 *  Nothing in this space shows it. Every explorer will tell you a Safe's balance and most will
 *  list its owners, but the fallback handler, the guard and the enabled modules are the parts
 *  that decide what the account *can be made to do* — a module can move funds without any owner
 *  signature at all, and a guard can stop every transaction. An account with an unexpected module
 *  is compromised in a way that reading its owner list cannot reveal.
 */
/**
 *  Safe's storage slots, as literals.
 *
 *  Hardcoded rather than computed at runtime, because these are constants in Safe's own source
 *  and re-deriving them on every read would be work with a chance of being wrong. The chance of
 *  being wrong is not hypothetical: the module guard's preimage is
 *  `module_manager.module_guard.address`, not the `module_guard_manager.…` that its variable name
 *  suggests, and guessing it produces a plausible slot that reads zero forever. The test beside
 *  this file asserts each literal against its documented preimage, so the constant is checked
 *  without being recomputed in production.
 */
export declare const SAFE_SLOTS: {
    /**
     *  The proxy's singleton, in slot 0.
     *
     *  Not a hashed slot like the others: `SafeProxy` declares `address internal singleton` as its
     *  first variable specifically so it lands at slot 0 in every contract that delegates to it,
     *  and its own comment says to read it with `getStorageAt` because the variable is internal.
     */
    readonly singleton: "0x0000000000000000000000000000000000000000000000000000000000000000";
    /** `keccak256("fallback_manager.handler.address")` */
    readonly fallbackHandler: "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5";
    /** `keccak256("guard_manager.guard.address")` */
    readonly guard: "0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8";
    /** `keccak256("module_manager.module_guard.address")` */
    readonly moduleGuard: "0xb104e0b93118902c651344349b610029d694cfdec91c589c91ebafbcd0289947";
};
/** `modules[SENTINEL_MODULES]` holds the first module; the list ends back at the sentinel. */
export declare const SENTINEL_MODULES: Address;
/** An account's configuration. Every field is `undefined` when its read did not answer. */
export type AccountConfig = {
    readonly account: Address;
    /** Safe's own version string, e.g. `1.4.1`. */
    readonly version: string | undefined;
    /**
     *  The next transaction's nonce.
     *
     *  Worth showing because `0` on a deployed account means nothing has ever executed through it —
     *  and on an *undeployed* one it is `0` by construction, which is what lets a signature be
     *  collected before the account exists.
     */
    readonly nonce: bigint | undefined;
    /**
     *  Enabled modules.
     *
     *  An empty array is a real and reassuring answer; `undefined` is not. A module can execute
     *  from the account with no owner signature, so "we could not read the modules" and "there are
     *  no modules" must never render the same way.
     */
    readonly modules: readonly Address[] | undefined;
    /** Set when there are more modules than one page held, so `modules` is a prefix. */
    readonly moreModules: boolean;
    /** The EIP-1271 fallback handler — what makes a Safe able to sign for another Safe. */
    readonly fallbackHandler: Address | undefined;
    /** A guard vetoes every transaction. `zeroAddress` means none. */
    readonly guard: Address | undefined;
    /** A module guard vetoes every module execution. `zeroAddress` means none. */
    readonly moduleGuard: Address | undefined;
    /**
     *  The singleton this proxy delegates to.
     *
     *  Read from storage rather than through `masterCopy()`, because the call would be answered by
     *  the singleton itself — so a proxy pointing somewhere unexpected could answer whatever it
     *  liked. The storage slot cannot lie about where the delegation goes.
     */
    readonly singleton: Address | undefined;
    readonly requests: number;
};
/**
 *  Everything about an account's configuration that can be read without an indexer.
 *
 *  One page of modules, not all of them: an unbounded loop here is a request budget a UI cannot
 *  predict, and {@link AccountConfig.moreModules} says when the list is a prefix so the caller can
 *  admit it rather than imply completeness.
 */
export declare function configOf(client: Client, account: Address, options?: {
    modulePageSize?: bigint;
}): Promise<AccountConfig>;
/** Which key and index produced an address. */
export type Derivation = {
    readonly accountId: Address;
    readonly index: bigint;
};
/**
 *  Prove which `(accountId, index)` an address came from, offline.
 *
 *  Not a lookup and not a guess — a **proof by reproduction**. The address is
 *  `CREATE3(factory, keccak256(abi.encode(accountId, index)))`, so re-deriving from a candidate
 *  and comparing is exact: a match cannot be a coincidence, and a miss cannot be a false negative
 *  within the range searched.
 *
 *  The derivation is not invertible, which is why candidates have to be supplied. On an account
 *  page the natural candidates are the account's own owners: the factory's `accountId` is the
 *  account's first owner at creation, so it is almost always still in the owner set — and when it
 *  is not (the owners were rotated), no candidate matches and this returns `undefined`, which is
 *  the honest answer rather than a wrong attribution.
 *
 *  Costs nothing on chain: every candidate is a local hash.
 *
 *  Throws for a chain the factory has no deployment on, rather than returning `undefined`. The
 *  two mean different things and only one of them is true: `undefined` says "none of these keys
 *  derives this address", which is a claim about the keys, while an unknown chain means the
 *  question could not be asked at all. Note that the three deployed chains share one factory
 *  address, so an attribution on any of them holds on all of them — `chainId` matters here for
 *  the day that stops being true.
 */
export declare function attributeAddress(chainId: number, address: Address, candidates: readonly Address[], options?: {
    maxIndex?: bigint;
    saltVersion?: string;
}): Derivation | undefined;
//# sourceMappingURL=account-config.d.ts.map