// `client.createExecutor(spec)`: the one owner-derived door to the built-in
// executors. Each one is bound to the owning engine's chain, socket, fee
// envelope and nonce lane (SDK-OWN-001) — the spec names only WHO acts
// (a key, a wallet, a session seed, a smart account), never infrastructure.
import { privateKeyToAccount } from "viem/accounts";
import { isHex, size, } from "viem";
import * as Config from "../config.js";
import { InvalidInputError } from "../errors.js";
import * as LocalExecutor from "./local.js";
import * as SessionExecutor from "./session.js";
import * as SmartAccountExecutor from "./smartAccount.js";
import * as WalletExecutor from "./wallet.js";
/**
 *  Derive the local account, turning viem's rejection of an invalid scalar (zero,
 *  or at/above the curve order — 32 bytes of hex that is still no key) into the
 *  {@link InvalidInputError} the factory's union names, the original as `cause`.
 */
function localAccountFrom(privateKey, nonceManager) {
    try {
        return privateKeyToAccount(privateKey, { nonceManager });
    }
    catch (e) {
        throw new InvalidInputError("privateKey is not a valid secp256k1 private key", { cause: e });
    }
}
/**
 *  Build the executor a spec names, bound to the owning engine. Internal —
 *  reached as `client.createExecutor(spec)`.
 *
 * @internal
 */
export function createExecutorFromSpec(spec, deps) {
    const config = deps.getConfig();
    const chain = config.chain;
    const fees = config.fees ?? Config.DEFAULT_FEES;
    const defaultGas = Config.DEFAULT_GAS;
    // Both credentials are 32-byte hex. Checked HERE so a malformed one is an
    // InvalidInputError at the owner's door, not a raw viem / derivation error
    // from inside `privateKeyToAccount` or the session-key derivation.
    // Exactly one variant. The union is structural, so a merged object can carry
    // two selectors; picking one by precedence would transact as an actor the
    // caller did not mean. `account` alone is a variant; beside `walletClient`
    // it names the wallet's signing identity, so it does not count twice.
    const selectors = ["privateKey", "walletClient", "sessionSeed", "smartAccount"].filter((k) => k in spec);
    if ("account" in spec && !("walletClient" in spec))
        selectors.push("account");
    if (selectors.length !== 1) {
        throw new InvalidInputError(`an executor spec names exactly one of privateKey / account / walletClient / sessionSeed / smartAccount (got ${selectors.length === 0 ? "none" : selectors.join(" + ")})`);
    }
    // A node-side session executor sends its seed with every write. Behind an
    // account the seed controls the account's funds, so the inner must sign
    // locally.
    if ("smartAccount" in spec && SessionExecutor.isSessionKeyExecutor(spec.inner)) {
        throw new InvalidInputError("an account's inner cannot be a createExecutor({ sessionSeed }) executor: it sends the seed to the node on every write. Sign locally with createExecutor({ privateKey: sessionPrivateKey(seed) }), or use exchange.accounts.accountFor(accountId, index, { sessionSeed })");
    }
    const requireSecret = (value, what) => {
        if (!isHex(value, { strict: true }) || size(value) !== 32) {
            throw new InvalidInputError(`${what} must be 32 bytes of hex`);
        }
        return value;
    };
    if ("smartAccount" in spec) {
        if (spec.inner.chainId !== chain.id) {
            throw new InvalidInputError(`the account's inner executor sends on chain ${spec.inner.chainId}, but this engine is chain ${chain.id}`);
        }
        return SmartAccountExecutor.createSmartAccountExecutor({
            smartAccount: spec.smartAccount,
            inner: spec.inner,
            ...(spec.through !== undefined ? { through: spec.through } : {}),
            ...(spec.signer !== undefined ? { signer: spec.signer } : {}),
            // Lazy: a client with no chain transport still builds a smart-account
            // executor; its first execute reads the account's code through it.
            getClient: deps.getClient,
            runtime: deps.writerRuntime,
        });
    }
    if ("sessionSeed" in spec) {
        // The seed is checked BEFORE the transport is resolved, so a malformed
        // seed is InvalidInputError even on a client with no socket.
        const seed = requireSecret(spec.sessionSeed, "sessionSeed");
        return SessionExecutor.createSessionKeyExecutor({ chainId: chain.id, native: deps.getNative(), seed, defaultGas });
    }
    if ("walletClient" in spec) {
        const from = spec.account ?? spec.walletClient.account;
        if (!from) {
            throw new InvalidInputError("a walletClient executor needs an account — pass `account` or a wallet client with one");
        }
        return WalletExecutor.createWalletClientExecutor({
            chain,
            publicClient: deps.getClient(),
            walletClient: spec.walletClient,
            from,
            fees,
            defaultGas,
            getReceiptSignal: deps.getReceiptSignal ?? (() => deps.getConfig().signal),
            ...(deps.dbg ? { dbg: deps.dbg } : {}),
        });
    }
    const account = "privateKey" in spec
        ? localAccountFrom(requireSecret(spec.privateKey, "privateKey"), deps.writerRuntime.nonceManager)
        : spec.account;
    return LocalExecutor.createLocalSignerExecutor({
        chain,
        publicClient: deps.getClient(),
        account,
        fees,
        defaultGas,
        runtime: deps.writerRuntime,
        getReceiptSignal: deps.getReceiptSignal ?? (() => deps.getConfig().signal),
        ...(deps.dbg ? { dbg: deps.dbg } : {}),
    });
}
