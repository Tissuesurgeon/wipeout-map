// Session accounts, derived LOCALLY.
//
// A session is a 32-byte seed. The node turns that seed into a key pair and signs
// on your behalf (`somnia_sendSessionTransaction`) — but the derivation is public
// and deterministic, so the same address can be computed here with no RPC at all.
// That is worth having for three reasons: you can show a user their session address
// before any network call, you can pre-fund it offline, and — the important one —
// you can see plainly that **the seed is a private key in another shape**.
//
// LOCKSTEP: github.com/somnia-chain/somnia2 — `docs/session_transactions.md`
// (§"Key derivation") and `docs/generate-non-random-private-key.md`. Verified
// against a live Shannon node: seed `0x11…11` derives
// `0xd56d8c05aa8da0f3afd676aec94014e89af3cc51`, which is exactly what
// `somnia_getSessionAddress` returns for it. test/native.e2e.test.ts re-checks the
// two against each other on demand, which is the assertion that keeps this honest.

import { concat, keccak256, numberToHex, size, type Address, type Hex } from "viem";
import { privateKeyToAddress } from "viem/accounts";

const ERR = "@somnia-chain/markets-sdk/native";

/** Order of the secp256k1 curve — a candidate key must land in `[1, n-1]`. */
const SECP256K1_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

/** How many counter values to try before giving up. See the note in `sessionPrivateKey`. */
const MAX_ATTEMPTS = 256;

/** A 32-byte seed, checked. */
function requireSeed(seed: Hex): Hex {
  if (!/^0x[0-9a-fA-F]*$/.test(seed) || size(seed) !== 32) {
    throw new Error(`${ERR}: a session seed must be 32 bytes of hex (got ${seed?.length ?? 0} chars)`);
  }
  return seed;
}

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
export function sessionPrivateKey(seed: Hex): Hex {
  requireSeed(seed);
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const candidate = keccak256(concat([seed, uint64Le(i)]));
    const value = BigInt(candidate);
    if (value > 0n && value < SECP256K1_N) return candidate;
  }
  // Unreachable in this universe; still better than returning an invalid key.
  throw new Error(`${ERR}: no valid secp256k1 key found for this seed after ${MAX_ATTEMPTS} attempts`);
}

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
export function sessionAddress(seed: Hex): Address {
  return privateKeyToAddress(sessionPrivateKey(seed));
}

/** `i` as eight little-endian bytes, per the node's derivation input. */
function uint64Le(i: number): Hex {
  const be = numberToHex(i, { size: 8 }).slice(2);
  const bytes = be.match(/../g) ?? [];
  return `0x${bytes.reverse().join("")}`;
}
