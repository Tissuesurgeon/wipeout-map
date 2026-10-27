// An EIP-1193 provider, as a signer and a sender.
//
// `Signer` and `PayingWallet` are interfaces so that a consumer with an unusual key — an HSM, a
// remote signing service, a test double — can satisfy them. But nearly every consumer has an
// ordinary EIP-1193 provider, and left to implement the interfaces themselves they each rediscover
// the same four things the hard way:
//
//   - Typed data goes over the wire as a JSON string, not an object. Privy's enclave requires it,
//     and a bigint cannot be serialised by `JSON.stringify` at all, so the naive version throws
//     before it reaches any wallet.
//   - `personal_sign` and `eth_sign` take their parameters in the OPPOSITE order, and wallets
//     implement one or the other.
//   - A browser extension can break signing from outside the app entirely. See {@link sanitize}.
//   - A wallet can answer with something that is not a signature, and passing it on turns a clear
//     failure here into `GS026` on chain.
//
// None of that is a decision an app should be making, so this module makes it once.
import { isHex } from "viem";
import { WalletResponseError } from "./errors.js";
/**
 *  A JSON string value that is a JS BigInt literal — digits with a trailing `n`, as in
 *  `"1700000000n"`. Never legitimate in EIP-712 typed data, where numerics are decimal or hex
 *  strings, so a match is always the corruption {@link sanitize} describes.
 */
const BIGINT_LITERAL = /"(-?\d+)n"/g;
/**
 *  Strip BigInt `n` suffixes from a serialised typed-data payload.
 *
 *  **The corruption comes from outside the app.** A page-level `BigInt.prototype.toJSON` override,
 *  which some browser extensions inject, runs BEFORE `JSON.stringify`'s replacer and leaks the
 *  literal `n` into the payload. Privy's enclave then rejects it with `Cannot convert …n to a
 *  BigInt` and an HTTP 400. This caused a wave of failed orders in the dex app in July 2026:
 *  silent, and only for users with such an extension installed — which is to say, undebuggable
 *  from the outside and unreproducible on a clean machine.
 *
 *  Stripping the suffix restores the exact decimal value, so the wallet signs the intended hash
 *  rather than refusing to sign at all.
 *
 *  @param payload The serialised typed data.
 *  @returns The same JSON with any BigInt literals reduced to decimals.
 */
export function sanitize(payload) {
    return payload.replace(BIGINT_LITERAL, '"$1"');
}
/**
 *  Serialise typed data the way wallets actually want it.
 *
 *  `JSON.stringify` throws on a bigint rather than serialising it, and EIP-712 integers go on the
 *  wire as decimal strings anyway, so every one is converted. Then sanitised, because the replacer
 *  is not the last thing to touch the value.
 *
 *  @param typedData The payload, whose integers may be bigints.
 *  @returns The JSON a wallet will accept.
 */
export function serializeTypedData(typedData) {
    return sanitize(JSON.stringify(typedData, (_key, value) => typeof value === "bigint" ? value.toString() : value));
}
/**
 *  Make a {@link SigningWallet} out of an EIP-1193 provider.
 *
 *  The result both signs and pays, which is what an EOA is. Hand it to `signAndSubmit` on its own
 *  for "this wallet does everything", or as the `signer` with a relayer as the `sender` for "this
 *  wallet signs and somebody else pays" — the same object serves both, which is the point.
 *
 *  @param args.address The account, which must be one the provider holds.
 *  @param args.getProvider How to reach it. A function rather than a value because a wallet
 *         connection is re-established across reloads and an object captured once goes stale.
 *  @param args.external Whether the user brought this wallet. An injected wallet validates
 *         `domain.chainId` against its selected network, so it is offered the digest first; an
 *         embedded key renders anything and is offered typed data, which a person can actually
 *         read before approving.
 *  @returns The wallet.
 */
export function walletSigner(args) {
    const { address, getProvider } = args;
    return {
        address,
        getProvider,
        ...(args.external === undefined ? {} : { external: args.external }),
        async signTypedData(payload) {
            const provider = await getProvider();
            return expectSignature(await provider.request({
                method: "eth_signTypedData_v4",
                params: [address, serializeTypedData(payload)],
            }), "typed data");
        },
        async signDigest(digest) {
            const provider = await getProvider();
            let raw;
            try {
                raw = await provider.request({ method: "personal_sign", params: [digest, address] });
            }
            catch (first) {
                try {
                    // Note the reversed parameter order. This is not a typo — `eth_sign` takes the address
                    // first, and a wallet handed them the other way round signs the address as a message.
                    raw = await provider.request({ method: "eth_sign", params: [address, digest] });
                }
                catch {
                    // The first failure is the one worth reporting: `eth_sign` is the fallback, and most
                    // wallets that lack it also disabled it deliberately, which says nothing useful.
                    throw first;
                }
            }
            return expectSignature(raw, "message");
        },
    };
}
/**
 *  Insist on 65 bytes, so a wallet's odd answer fails here rather than on chain.
 *
 *  A malformed signature reaches the contract as `GS026` or a failed recovery — a revert with no
 *  connection to the wallet that caused it, two layers away from anything a developer can act on.
 */
function expectSignature(raw, what) {
    if (!isHex(raw) || raw.length !== 132) {
        throw new WalletResponseError(`The wallet returned a malformed ${what} signature: ${String(raw)}`, { method: what });
    }
    return raw;
}
//# sourceMappingURL=wallet-signer.js.map