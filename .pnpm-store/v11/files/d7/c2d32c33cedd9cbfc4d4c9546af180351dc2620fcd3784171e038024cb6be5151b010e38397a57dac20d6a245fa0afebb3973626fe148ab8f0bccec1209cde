import { type Address } from "viem";
import type { Call } from "./call.js";
/**
 *  Safe's sentinel owner, `0x…01`.
 *
 *  Safe stores owners as a circular linked list whose head and tail are both this address, so it
 *  is the `prevOwner` of the first real owner. It is not an owner and cannot be added as one.
 */
export declare const SENTINEL_OWNERS: Address;
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
export declare function prevOwner(owners: readonly Address[], owner: Address): Address;
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
export declare function addOwnerCall(account: Address, owner: Address, threshold: bigint): Call;
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
export declare function swapOwnerCall(account: Address, owners: readonly Address[], oldOwner: Address, newOwner: Address): Call;
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
export declare function removeOwnerCall(account: Address, owners: readonly Address[], owner: Address, threshold: bigint): Call;
/**
 *  Change how many owner signatures `account` requires.
 *
 *  @param account The account, which is also the caller Safe requires.
 *  @param threshold The new threshold. Safe rejects zero and anything above the owner count.
 *  @returns The call the owner signs.
 */
export declare function changeThresholdCall(account: Address, threshold: bigint): Call;
//# sourceMappingURL=safe.d.ts.map