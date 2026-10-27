// Account address derivation.
//
// LOCKSTEP: this module mirrors `_salt` in `smart-contracts/src/SomniaAccountFactory.sol` and
// `CREATE3.predictDeterministicAddress` in `lib/solady`. The three compute the same address from
// the same inputs, and `test/address.test.ts` and `test/predict.test.ts` pin this side against
// values produced by the contract side. Change one, change the other, in the same PR — nothing in
// either type system can catch a drift, and the symptom would be an account the client shows at an
// address the chain never deploys to.
import { encodeAbiParameters, getContractAddress, getCreate2Address, keccak256, } from "viem";
/**
 *  Derives the CREATE3 salt for one of an owner's accounts.
 *
 *  An owner has as many accounts as they care to deploy and picks the index themselves. No value
 *  is reserved and there is no hierarchy: the account at index 7 is not beneath the one at index 0,
 *  it is simply the eighth address that owner may occupy. Each is an independent Safe with the same
 *  sole owner, its own balance and its own permissions.
 *
 *  ```ts
 *  accountSalt("0x000000000000000000000000000000000000a11c", 0n);
 *  // "0x4df3ced26eeec1ed9b325277c125883880918ffa14ee973dcd62beb5e1853dfd"
 *  accountSalt("0x000000000000000000000000000000000000a11c", 1n);
 *  // "0xeee02ac91c7acea53e8d94d46a61938616c8f92ab828527daff563d71e403ddf"
 *  ```
 *
 *  `encodeAbiParameters` rather than a packed encoding, matching the contract: the fixed-width form
 *  stays collision-free if a field is ever appended. Because it is fixed-width it is also
 *  injective, so one `(accountId, index)` pair means exactly one address — there is no second
 *  derivation that could reach the same address with a different owner in mind.
 *
 *  @param accountId The owner EOA's address. Becomes the account's only owner.
 *  @param index Which of that owner's accounts. Any `uint256`.
 *  @returns The CREATE3 salt for that account.
 */
export function accountSalt(accountId, index) {
    return keccak256(encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [accountId, index]));
}
/**
 *  `keccak256` of the CREATE3 proxy's init code, as solady's `CREATE3` library uses it.
 *
 *  The 16 bytes `0x67363d3d37363d34f03d5260086018f3`, which return an 8-byte runtime that
 *  `CREATE`s whatever calldata it is handed. Pinned here rather than derived: it is a constant of
 *  the deployed library, so reading it from the hex would only move the place a drift hides.
 *
 *  @see {@link predictAccountAddress} for why this is the only thing between a salt and an address.
 */
export const CREATE3_PROXY_INITCODE_HASH = "0x21c35dbe1b344a2488cf3321d6ce542f8e9f305544ff09e4993a62319a497c1f";
/**
 *  Derives an account's address offline, from the factory it would be deployed by.
 *
 *  CREATE3 in two steps, which is all CREATE3 is: `CREATE2` a throwaway proxy from the factory
 *  using the salt, then take the address that proxy's first `CREATE` lands on — nonce 1, because a
 *  fresh account's first deployment is its nonce-1 transaction. The account's own init code never
 *  enters either step, which is exactly the property being bought: the address survives every
 *  later change to the account (owners, threshold, modules, guards, even the singleton it delegates
 *  to) and is the same on every chain the factory reaches.
 *
 *  **This is a prediction, and the chain is the authority.** It agrees with the deployed factory
 *  today — checked against `accountAddress(...)` on all three chains on 2026-09-02 — but the
 *  factory is UUPS-upgradeable, so an upgrade could in principle derive differently and this
 *  function would then be confidently wrong. Use it to show an address before anything is deployed
 *  and to avoid a round trip; use {@link readAccountAddress} when being wrong is expensive, such
 *  as before publishing a deposit address or moving value.
 *
 *  @param factory The factory's address. Part of the derivation, not a lookup.
 *  @param accountId The owner EOA's address.
 *  @param index Which of that owner's accounts. Any `uint256`.
 *  @returns The account's address, deployed or not.
 */
export function predictAccountAddress(factory, accountId, index) {
    const proxy = getCreate2Address({
        from: factory,
        salt: accountSalt(accountId, index),
        bytecodeHash: CREATE3_PROXY_INITCODE_HASH,
    });
    return getContractAddress({ from: proxy, nonce: 1n });
}
//# sourceMappingURL=address.js.map