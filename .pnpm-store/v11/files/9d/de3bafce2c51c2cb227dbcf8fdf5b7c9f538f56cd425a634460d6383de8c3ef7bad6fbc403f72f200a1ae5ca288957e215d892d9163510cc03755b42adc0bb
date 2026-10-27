import { getAddress } from "viem";
import { getStorageAt, readContract } from "viem/actions";
import { safeAbi } from "./abi/generated/index.js";
import { accountAddress } from "./factory.js";
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
export const SAFE_SLOTS = {
    /**
     *  The proxy's singleton, in slot 0.
     *
     *  Not a hashed slot like the others: `SafeProxy` declares `address internal singleton` as its
     *  first variable specifically so it lands at slot 0 in every contract that delegates to it,
     *  and its own comment says to read it with `getStorageAt` because the variable is internal.
     */
    singleton: "0x0000000000000000000000000000000000000000000000000000000000000000",
    /** `keccak256("fallback_manager.handler.address")` */
    fallbackHandler: "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5",
    /** `keccak256("guard_manager.guard.address")` */
    guard: "0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8",
    /** `keccak256("module_manager.module_guard.address")` */
    moduleGuard: "0xb104e0b93118902c651344349b610029d694cfdec91c589c91ebafbcd0289947",
};
/** `modules[SENTINEL_MODULES]` holds the first module; the list ends back at the sentinel. */
export const SENTINEL_MODULES = "0x0000000000000000000000000000000000000001";
/**
 *  Read one slot as an address, or `undefined` when the read did not answer.
 *
 *  **An untouched slot comes back as the bare string `"0x"`, not as a padded zero word.** Slicing
 *  the last 40 characters off that yields `"0x"`, which `getAddress` rejects — so the naive
 *  version reported "could not read the guard" for an account that provably has none. That is the
 *  worst direction for this field to fail in: a clean account looks uncertain, and the reader is
 *  left unsure whether something can veto their transactions when the answer is a definite no.
 *
 *  Padding first makes zero a real answer. Only a thrown request stays `undefined`.
 */
async function slotAsAddress(client, address, slot) {
    try {
        const word = await getStorageAt(client, { address, slot });
        if (word === undefined)
            return undefined;
        // Left-pad to a full 32-byte word so a short or empty answer reads as zero. An address
        // occupies the low 20 bytes; the rest is padding.
        const padded = word.slice(2).padStart(64, "0");
        return getAddress(`0x${padded.slice(-40)}`);
    }
    catch {
        return undefined;
    }
}
async function tryRead(work) {
    try {
        return await work();
    }
    catch {
        // Deliberately swallowed to `undefined` rather than thrown. An account may be undeployed, an
        // older Safe may lack a function, and a node may simply refuse — all three are "no answer",
        // and a caller that has to try/catch each field ends up rendering one failure as six.
        return undefined;
    }
}
/**
 *  Everything about an account's configuration that can be read without an indexer.
 *
 *  One page of modules, not all of them: an unbounded loop here is a request budget a UI cannot
 *  predict, and {@link AccountConfig.moreModules} says when the list is a prefix so the caller can
 *  admit it rather than imply completeness.
 */
export async function configOf(client, account, options = {}) {
    const address = getAddress(account);
    const pageSize = options.modulePageSize ?? 10n;
    const [version, nonce, modulePage, fallbackHandler, guard, moduleGuard, singleton] = await Promise.all([
        tryRead(() => readContract(client, { address, abi: safeAbi, functionName: "VERSION" })),
        tryRead(() => readContract(client, { address, abi: safeAbi, functionName: "nonce" })),
        tryRead(() => readContract(client, {
            address,
            abi: safeAbi,
            functionName: "getModulesPaginated",
            args: [SENTINEL_MODULES, pageSize],
        })),
        slotAsAddress(client, address, SAFE_SLOTS.fallbackHandler),
        slotAsAddress(client, address, SAFE_SLOTS.guard),
        slotAsAddress(client, address, SAFE_SLOTS.moduleGuard),
        slotAsAddress(client, address, SAFE_SLOTS.singleton),
    ]);
    const modules = modulePage === undefined || modulePage === null
        ? undefined
        : modulePage[0].map((m) => getAddress(m));
    // `next` back at the sentinel means the list terminated inside this page.
    const next = modulePage === undefined || modulePage === null ? undefined : modulePage[1];
    const moreModules = next !== undefined &&
        next.toLowerCase() !== SENTINEL_MODULES.toLowerCase() &&
        next !== "0x0000000000000000000000000000000000000000";
    return {
        account: address,
        version,
        nonce,
        modules,
        moreModules,
        fallbackHandler,
        guard,
        moduleGuard,
        singleton,
        requests: 7,
    };
}
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
export function attributeAddress(chainId, address, candidates, options = {}) {
    const maxIndex = options.maxIndex ?? 19n;
    const target = getAddress(address).toLowerCase();
    for (const candidate of candidates) {
        const accountId = getAddress(candidate);
        for (let index = 0n; index <= maxIndex; index++) {
            const derived = accountAddress(chainId, accountId, index, options.saltVersion);
            if (derived.toLowerCase() === target)
                return { accountId, index };
        }
    }
    return undefined;
}
//# sourceMappingURL=account-config.js.map