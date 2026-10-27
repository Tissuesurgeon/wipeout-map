import { type Address, type Hex } from "viem";
/**
 *  Derive a session's **private key** from its seed, exactly as the node does.
 *
 *  ```
 *  for i = 0, 1, 2, …:
 *    candidate = keccak256(seed ‖ uint64_le(i))
 *    if 0 < candidate < secp256k1_n: return candidate
 *  ```
 *
 *  The loop exists only for completeness: a 256-bit keccak output falls outside
 *  `[1, n-1]` with probability under 2^-128, so `i = 0` returns in every case
 *  anyone will ever observe. (Because `i = 0` encodes to eight zero bytes, its
 *  endianness is unobservable; the node documents little-endian and that is what
 *  this implements, so a hypothetical `i > 0` would still agree.)
 *
 *  This exists to make one thing unmissable: **whoever holds the seed holds this
 *  key**, and can move the session account's funds without touching the node.
 *  Guard a seed exactly as you would guard the key it produces.
 *
 * **Details**
 *
 * - `seed`: 32-byte session seed.
 * - Returns: The derived secp256k1 private key.
 *
 * **Gotchas**
 *
 * - Throws If the seed is not 32 bytes of hex.
 *
 * **Example** (Signing with a session key)
 *
 * ```ts
 * import { sessionPrivateKey } from "@somnia-chain/markets-sdk/native";
 * import { privateKeyToAccount } from "viem/accounts";
 *
 * // Sign locally instead of letting the node sign for you.
 * const account = privateKeyToAccount(sessionPrivateKey(seed));
 * ```
 *
 * @category native RPC
 */
export declare function sessionPrivateKey(seed: Hex): Hex;
/**
 *  The address a session seed controls — computed locally, no RPC.
 *
 *  Identical to what `somnia_getSessionAddress` returns for the same seed, and
 *  cheaper: use it to display or pre-fund a session account before any network
 *  call. `client.getSessionAddress(seed)` asks the node the same question if you
 *  want the round-trip as confirmation.
 *
 * **Details**
 *
 * - `seed`: 32-byte session seed.
 * - Returns: The checksummed address of the derived account.
 *
 * **Gotchas**
 *
 * - Throws If the seed is not 32 bytes of hex.
 *
 * **Example** (Deriving a session address)
 *
 * ```ts
 * import { sessionAddress } from "@somnia-chain/markets-sdk/native";
 *
 * const seed = "0x1111111111111111111111111111111111111111111111111111111111111111";
 * sessionAddress(seed); // "0xD56D8c05Aa8dA0f3Afd676Aec94014e89aF3cc51" — fund this
 * ```
 *
 * @category native RPC
 */
export declare function sessionAddress(seed: Hex): Address;
