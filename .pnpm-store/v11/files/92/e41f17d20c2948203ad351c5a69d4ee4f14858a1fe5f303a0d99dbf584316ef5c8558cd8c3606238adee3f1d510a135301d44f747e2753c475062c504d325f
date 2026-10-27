// Owner management on a deployed account.
//
// An account is an unmodified Safe, so these are Safe's own functions and they are all
// `authorized`: only the Safe itself may call them. "Add an owner" is therefore never a direct
// call. It is a Safe transaction whose `to` is the account, signed by the current owners and
// executed through the account's `execTransaction`.
//
// That indirection is the security model, and it is why granting a session key cannot be folded
// into the factory. The factory deploys an account owned by the EOA it derived the address from;
// deciding that a second key may act for that account is the owner's decision, and their signature
// is how they make it. Verifying such a signature inside the factory would mean reimplementing
// replay protection, chain binding, expiry and EIP-1271 in the one contract here with no upstream
// audit behind it, to save a round trip.
//
// Every builder returns a {@link Call} aimed at the account rather than bare calldata, because the
// target is the part that goes wrong: sent anywhere else these revert, and sent to the account by
// anyone other than the account they revert too.
import { encodeFunctionData, getAddress } from "viem";
import { safeAbi } from "./abi/generated/index.js";
import { NotAnOwnerError } from "./errors.js";
/**
 *  Safe's sentinel owner, `0x…01`.
 *
 *  Safe stores owners as a circular linked list whose head and tail are both this address, so it
 *  is the `prevOwner` of the first real owner. It is not an owner and cannot be added as one.
 */
export const SENTINEL_OWNERS = "0x0000000000000000000000000000000000000001";
/**
 *  The `prevOwner` argument for removing or swapping `owner`.
 *
 *  `removeOwner` and `swapOwner` splice a linked list, so they need the entry that points AT the
 *  one being changed, and Safe cannot find it for them without walking the list on chain.
 *  `getOwners()` returns the list in order, so the answer is the element before it — and the
 *  sentinel when it is the head, which is the case that gets guessed wrong.
 *
 *  A wrong `prevOwner` reverts (`GS205`) rather than doing something else, so the cost of guessing
 *  is a wasted transaction rather than a broken account. Derive it; do not guess it.
 *
 *  @param owners The account's owners, in the order `getOwners()` returned them.
 *  @param owner The owner being removed or replaced.
 *  @returns Its predecessor, or {@link SENTINEL_OWNERS} when it is first.
 *  @throws {NotAnOwnerError} When `owner` is not in `owners`.
 */
export function prevOwner(owners, owner) {
    // Compared case-insensitively: `getOwners()` answers in checksum case, a wallet or a URL may
    // hand over lowercase, and an equality test on the raw strings would report "not an owner" for
    // an owner that is right there.
    const target = owner.toLowerCase();
    const i = owners.findIndex((o) => o.toLowerCase() === target);
    if (i === -1)
        throw new NotAnOwnerError(owner, owners);
    if (i === 0)
        return SENTINEL_OWNERS;
    const previous = owners[i - 1];
    // Unreachable for `i > 0`, and asserted rather than cast: `noUncheckedIndexedAccess` is the
    // reason this SDK has no `as` in it, and one cast here would be the precedent for the next one.
    if (previous === undefined)
        throw new NotAnOwnerError(owner, owners);
    return previous;
}
/**
 *  Add `owner` to `account`, at the threshold you pass.
 *
 *  **`addOwnerWithThreshold` SETS the threshold — it does not leave it.** This line said
 *  "leaving the threshold where it is", which is what the name suggests and not what the contract
 *  does. A caller who believed it passed a literal `1` and silently turned a 2-of-3 account into
 *  1-of-4: a security downgrade, from a function that reads like it changes nothing. Pass the
 *  account's current threshold to keep it, and read it rather than assuming.
 *
 *  **Threshold 1 with two owners means the new key can do everything the first one can**, including
 *  removing it. There is no owner configuration that grants partial authority: threshold 2 would
 *  mean the new key cannot act alone, which defeats the point of having it. Restricting a key is
 *  what a module and a module guard are for, and that is a later step — so pass the threshold
 *  deliberately rather than treating this as a way to limit anything.
 *
 *  @param account The account, which is also the caller Safe requires.
 *  @param owner The address to add.
 *  @param threshold The threshold afterwards. Usually the current one, unchanged.
 *  @returns The call the owner signs.
 */
export function addOwnerCall(account, owner, threshold) {
    return {
        to: getAddress(account),
        value: 0n,
        data: encodeFunctionData({
            abi: safeAbi,
            functionName: "addOwnerWithThreshold",
            args: [owner, threshold],
        }),
    };
}
/**
 *  Replace `oldOwner` with `newOwner`, leaving the threshold alone.
 *
 *  How a session key is rotated, and the operation the account's address is designed to survive:
 *  the address comes from the owner EOA it was derived for, never from the current owner set, so
 *  every key around an account can be replaced and the address does not move.
 *
 *  Takes the owner LIST rather than a `prevOwner`, so the sentinel case cannot be got wrong — see
 *  {@link prevOwner}.
 *
 *  @param account The account, which is also the caller Safe requires.
 *  @param owners The account's owners, in the order `getOwners()` returned them.
 *  @param oldOwner The owner being replaced.
 *  @param newOwner The owner replacing it.
 *  @returns The call the owner signs.
 *  @throws {NotAnOwnerError} When `oldOwner` is not in `owners`.
 */
export function swapOwnerCall(account, owners, oldOwner, newOwner) {
    return {
        to: getAddress(account),
        value: 0n,
        data: encodeFunctionData({
            abi: safeAbi,
            functionName: "swapOwner",
            args: [prevOwner(owners, oldOwner), oldOwner, newOwner],
        }),
    };
}
/**
 *  Remove `owner` from `account`.
 *
 *  The revocation half of the activation flow: how a session key that leaked stops being able to
 *  act. Safe refuses to leave the account with fewer owners than the threshold, so lowering the
 *  threshold in the same call is often necessary rather than optional.
 *
 *  @param account The account, which is also the caller Safe requires.
 *  @param owners The account's owners, in the order `getOwners()` returned them.
 *  @param owner The owner being removed.
 *  @param threshold The threshold afterwards.
 *  @returns The call the owner signs.
 *  @throws {NotAnOwnerError} When `owner` is not in `owners`.
 */
export function removeOwnerCall(account, owners, owner, threshold) {
    return {
        to: getAddress(account),
        value: 0n,
        data: encodeFunctionData({
            abi: safeAbi,
            functionName: "removeOwner",
            args: [prevOwner(owners, owner), owner, threshold],
        }),
    };
}
/**
 *  Change how many owner signatures `account` requires.
 *
 *  @param account The account, which is also the caller Safe requires.
 *  @param threshold The new threshold. Safe rejects zero and anything above the owner count.
 *  @returns The call the owner signs.
 */
export function changeThresholdCall(account, threshold) {
    return {
        to: getAddress(account),
        value: 0n,
        data: encodeFunctionData({
            abi: safeAbi,
            functionName: "changeThreshold",
            args: [threshold],
        }),
    };
}
//# sourceMappingURL=safe.js.map