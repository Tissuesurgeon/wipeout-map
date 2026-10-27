import { type Address } from "viem";
import type { SigningWallet, WalletRequester } from "./submit.js";
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
export declare function sanitize(payload: string): string;
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
export declare function serializeTypedData(typedData: unknown): string;
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
export declare function walletSigner(args: {
    address: Address;
    getProvider: () => Promise<WalletRequester>;
    external?: boolean;
}): SigningWallet;
//# sourceMappingURL=wallet-signer.d.ts.map