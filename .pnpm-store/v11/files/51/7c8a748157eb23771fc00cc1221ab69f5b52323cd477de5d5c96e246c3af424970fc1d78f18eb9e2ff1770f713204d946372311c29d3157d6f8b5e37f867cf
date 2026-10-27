// Getting a transaction from a plan onto a chain, with whatever wallet is paying.
//
// **This is the step every consumer has to get right and none of them should be writing.** A plan
// says what should happen; a signature authorises it; and then something has to put bytes on the
// wire, wait, and check that what came back is a success rather than a receipt that merely exists.
// Each of those has a way to be quietly wrong, and the explorer had all three of them at once:
//
//  1. **The send method is not a free choice — it depends on the wallet.** An embedded key can
//     sign a whole transaction, so the caller broadcasts the raw bytes itself and the wallet's
//     selected network never enters it; that is what keeps acting on a second chain to one prompt.
//     An injected wallet cannot: `eth_signTransaction` is not a method MetaMask implements, and it
//     answers "Missing or invalid parameters". Pick wrong and the feature fails for exactly the
//     people using a wallet.
//  2. **A wallet that manages its own nonce must not be handed one.** A nonce computed against a
//     different node is how a transaction ends up stuck behind a gap nobody can see.
//  3. **A receipt is not a success.** An out-of-gas revert produces a real receipt with a real
//     hash, and Somnia's gas floors are high enough that this is an ordinary outcome rather than a
//     theoretical one. A caller that stops at "the send returned" reports a failure as a success.
//
// So this module owns the whole step. A consumer supplies a wallet and a call, and gets back a
// hash it can show, or an error it can render.
import { getAddress, isHex, } from "viem";
import { getGasPrice, getTransactionCount, sendRawTransaction, waitForTransactionReceipt, } from "viem/actions";
import { isSenderBound } from "./call.js";
import { revertReason } from "./revert.js";
import { CannotPayError, TransactionRevertedError, UnconfirmedSendError, WrongSenderError, UnsupportedMethodError, WalletResponseError, WrongNetworkError, } from "./errors.js";
/** Whether a sender broadcasts for you rather than being a wallet you hold. */
function isRelay(sender) {
    return typeof sender.send === "function";
}
/**
 *  Whether a failure is the sender being unable to pay.
 *
 *  Walks the cause chain, because every layer wraps and the wording turns up at a different depth
 *  per provider.
 */
function isUnfunded(error) {
    const seen = new Set();
    let cursor = error;
    while (cursor !== undefined && cursor !== null && !seen.has(cursor)) {
        seen.add(cursor);
        const text = [
            cursor.message,
            cursor.details,
            cursor.shortMessage,
        ]
            .filter((part) => typeof part === "string")
            .join(" ")
            .toLowerCase();
        if (text.includes("account does not exist") || text.includes("insufficient funds"))
            return true;
        cursor = cursor.cause;
    }
    return false;
}
/**
 *  Whether a wallet's error means "I do not implement that method".
 *
 *  There is no reliable code for it. MetaMask answers `-32602` "Missing or invalid parameters";
 *  others send `-32601` "Method not found", or a plain string. Matching broadly is right here
 *  because the consequence of a false positive is one extra prompt on a method that works, and the
 *  consequence of a false negative is an action the user cannot perform at all.
 */
function isMethodRefusal(error) {
    if (typeof error !== "object" || error === null)
        return false;
    const code = error.code;
    if (code === -32601 || code === -32602)
        return true;
    const message = String(error.message ?? "").toLowerCase();
    if (/missing or invalid|method not (found|supported)|unsupported method|not implemented/.test(message)) {
        return true;
    }
    const cause = error.cause;
    return cause !== undefined && cause !== error && isMethodRefusal(cause);
}
/**
 *  Send one call and wait for it to succeed.
 *
 *  @param client A viem client for the chain being written to. Reads the nonce and gas price for
 *         an embedded wallet, broadcasts, and waits — all against this chain, never the wallet's.
 *  @param args.chain The chain, for the transaction's `chainId`.
 *  @param args.call Where, how much, and the calldata.
 *  @param args.gas The limit. Not estimated: on Somnia a nested `setup` needs a floor of gas
 *         REMAINING rather than a budget of gas spent, which an estimate cannot see. See
 *         `CREATE_ACCOUNT_GAS_LIMIT`.
 *  @param args.describe What to call this in an error, e.g. "The create transaction".
 *  @returns The hash and the block, once the receipt says success.
 *  @throws {TransactionRevertedError} When it was mined and reverted.
 *  @throws {CannotPayError} When the sender's balance will not cover the transaction.
 *  @throws {UnconfirmedSendError} When the send went out but waiting stopped. **Not a failure** —
 *          the transaction may still land, so re-check the hash before retrying.
 *  @throws {WrongNetworkError} When an injected wallet is on a different chain than `args.chain`.
 *  @throws {UnsupportedMethodError} When the wallet implements neither send path.
 *  @throws {WalletResponseError} When the wallet answers with something unusable — no hash, or a
 *          malformed signature.
 *  @throws {WrongSenderError} When `args.call` may only be sent by one address — a pre-validated
 *          execution — and `args.sender` is not it, or is a relayer whose address cannot be
 *          checked. Refused here because the chain refuses it as `GS025`, after the gas, without
 *          saying that the sender was the problem.
 */
export async function submitCall(client, args) {
    // Before anything is broadcast: a pre-validated signature names its own broadcaster, and sending
    // it from anywhere else is a paid-for revert that blames the signature.
    if (isSenderBound(args.call)) {
        const required = getAddress(args.call.sender);
        const offered = isRelay(args.sender) ? null : getAddress(args.sender.address);
        if (offered === null || offered !== required)
            throw new WrongSenderError(required, offered);
    }
    const hash = await broadcast(client, args);
    // From here nothing depends on who sent it. The hash exists, and every outcome has to carry it.
    let receipt;
    try {
        receipt = await waitForTransactionReceipt(client, { hash });
    }
    catch {
        // Waiting stopped. That says nothing about the transaction — see `UnconfirmedSendError`.
        throw new UnconfirmedSendError(hash, args.describe ?? "The transaction");
    }
    if (receipt.status !== "success") {
        // Go back to the chain for the reason. Best-effort by construction: a node that cannot replay
        // the block, or a revert with nothing decodable in it, leaves the error saying what it always
        // said. Only ever run for a transaction that has already failed, so the cost lands on the path
        // where an extra round trip is worth far more than it costs.
        const why = await revertReason(client, {
            to: args.call.to,
            data: args.call.data,
            blockNumber: receipt.blockNumber,
            ...(isRelay(args.sender) ? {} : { from: getAddress(args.sender.address) }),
            ...(args.errors === undefined ? {} : { errors: args.errors }),
        }).catch(() => null);
        throw new TransactionRevertedError(hash, args.describe ?? "The transaction", {
            blockNumber: receipt.blockNumber,
            ...(why === null ? {} : { reason: why.reason }),
        });
    }
    return { hash, blockNumber: receipt.blockNumber, receipt };
}
/** Put the bytes on chain, by whichever route the sender is. */
async function broadcast(client, args) {
    if (isRelay(args.sender)) {
        // The measured limit goes WITH the call. `submitCall` has already worked out what this needs —
        // by the caller's explicit value, the prepared floor, or a measurement — and a relayer has no
        // way to derive it: the nested-frame requirement is invisible to `eth_estimateGas`. Dropping it
        // here left every relayer to guess, which is how a 2,500,000 default meets a 20,000,000 floor.
        return args.sender.send(args.call, args.chain.id, { gas: args.gas });
    }
    const provider = await args.sender.getProvider();
    const from = getAddress(args.sender.address);
    const to = getAddress(args.call.to);
    const external = args.sender.external === true;
    const tx = { from, to, data: args.call.data, gas: args.gas, chainId: args.chain.id };
    // **Try the cheap path, fall back to the one every wallet has.**
    //
    // `external` says which to try FIRST; it does not decide the outcome, because no flag can. A
    // wallet either implements `eth_signTransaction` or it does not, and that is a fact about the
    // wallet in front of you rather than about its category: MetaMask refuses it, and Privy's
    // embedded signer refuses it on some configurations too — both with the same opaque "Missing or
    // invalid parameters". This code asserted the category and told the user their transaction had
    // failed.
    //
    // So: attempt, and on a refusal use `eth_sendTransaction`, which is universal. The cost of the
    // fallback is that the wallet must be on the right network, which `sendViaWallet` checks before
    // it prompts — a real cost, and smaller than an action that cannot be performed at all.
    try {
        if (external)
            return await sendViaWallet(provider, tx);
        try {
            return await signAndBroadcast(client, provider, tx);
        }
        catch (refused) {
            if (refused instanceof UnsupportedMethodError || isMethodRefusal(refused)) {
                return await sendViaWallet(provider, tx);
            }
            throw refused;
        }
    }
    catch (failed) {
        // Last, so a refusal still gets its fallback: this only names what is left over. Definite —
        // nothing reached the chain — and worth naming, because the node's wording for an empty
        // wallet is "account does not exist".
        if (isUnfunded(failed))
            throw new CannotPayError(from, failed);
        throw failed;
    }
}
/**
 *  `eth_sendTransaction`, for a wallet the user brought.
 *
 *  No nonce and no gas price: an injected wallet fills both itself, and one computed elsewhere is
 *  how a transaction gets stuck. The cost is that the wallet must be on the right network — which
 *  is the reason the embedded path below exists, not a reason to use it here.
 */
async function sendViaWallet(provider, tx) {
    // **Check the network BEFORE the prompt, because `eth_sendTransaction` carries no chain.** It
    // executes on whatever the wallet has selected, and this system puts the same factory at the
    // same address on every chain — so a wallet left on testnet while the user is on the mainnet
    // account page creates the account on testnet, the UI says mainnet, and the caller then waits
    // for a mainnet receipt that will never exist. On an unrelated network the calldata reaches an
    // address with no code, succeeds, and burns real gas for nothing.
    const selected = await provider.request({ method: "eth_chainId" });
    const on = typeof selected === "string" ? Number.parseInt(selected, 16) : Number(selected);
    if (Number.isFinite(on) && on !== tx.chainId) {
        throw new WrongNetworkError(tx.chainId, on);
    }
    const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [
            {
                from: tx.from,
                to: tx.to,
                data: tx.data,
                value: "0x0",
                gas: `0x${tx.gas.toString(16)}`,
            },
        ],
    });
    if (!isHex(hash) || hash.length !== 66) {
        throw new WalletResponseError(`The wallet returned no transaction hash: ${String(hash)}`, {
            method: "eth_sendTransaction",
        });
    }
    return hash;
}
/**
 *  `eth_signTransaction` plus our own broadcast, for an embedded key.
 *
 *  Every field is supplied so the wallet populates nothing, and the `chainId` is inside what it
 *  signs — so the wallet's idea of its current network never enters the decision. That is the
 *  property that makes acting on another chain one prompt rather than a chain-switch dialog, and
 *  it is why this path is worth keeping despite most injected wallets refusing the method.
 */
async function signAndBroadcast(client, provider, tx) {
    const [nonce, gasPrice] = await Promise.all([
        getTransactionCount(client, { address: tx.from }),
        getGasPrice(client),
    ]);
    const raw = await provider.request({
        method: "eth_signTransaction",
        params: [
            {
                from: tx.from,
                to: tx.to,
                data: tx.data,
                value: "0x0",
                nonce: `0x${nonce.toString(16)}`,
                gasLimit: `0x${tx.gas.toString(16)}`,
                gasPrice: `0x${gasPrice.toString(16)}`,
                chainId: tx.chainId,
                type: 0,
            },
        ],
    });
    if (!isHex(raw)) {
        throw new UnsupportedMethodError("eth_signTransaction");
    }
    return sendRawTransaction(client, { serializedTransaction: raw });
}
/**
 *  Sign a digest in the shape the contracts accept.
 *
 *  Tries typed data first for a wallet that has it, falls back to signing the digest as a message
 *  and marks it Safe's way. A user's rejection is rethrown rather than retried through the other
 *  method — being asked twice for one decision reads as an app that will not take no.
 *
 *  @param signer Whoever holds the key.
 *  @param what The typed data to prefer, the digest it hashes to, and whether that typed data
 *         carries a `chainId` — see below.
 *  @returns 65 bytes, `v` in {27,28} for typed data or {31,32} for a message.
 *  @throws {WalletResponseError} When the wallet answers with something that is not a usable
 *          signature. Deliberately not swallowed into the message fallback: treating nonsense as
 *          "cannot do typed data" would hand back a signature over a different hash than the
 *          caller believes was signed.
 *  @throws {RpcError} When the signer refused or the transport failed; a rejection is rethrown
 *          rather than retried through the other method.
 */
export async function signWith(signer, what) {
    // **Only the call is inside the `try`.** Validating in there would make a malformed answer
    // indistinguishable from a refusal, and the fallback would quietly paper over it: the wallet
    // returns 4 bytes, we treat that as "cannot do typed data", sign the digest instead and hand
    // back a signature recovered against a different hash than the caller believes was signed. A
    // wallet answering nonsense is broken, and the caller needs to hear about it.
    // **Whether an injected wallet is offered typed data depends on the payload, not the wallet.**
    // This was `external` alone, which is wrong in both directions. An injected wallet validates
    // `domain.chainId` against its selected network, so typed data naming another chain means a
    // chain switch — or, on a network it has never seen, an add-chain dialog — before it will sign.
    // That is why a Safe transaction goes to such a wallet as a digest. But an account
    // authorization's domain has no `chainId` at all, which is the entire feature, so there is
    // nothing to validate and nothing to switch: sending that one as a digest gives up a readable
    // prompt for no reason, and asking someone to approve 32 opaque bytes is exactly the habit that
    // makes phishing work.
    const preferDigest = signer.external === true && what.chainBound === true;
    if (!preferDigest) {
        let typed;
        try {
            typed = await signer.signTypedData(what.typedData);
        }
        catch (caught) {
            // A wallet that cannot render this domain can still sign the hash. A person who said no
            // has answered, and gets asked once.
            if (isUserRejection(caught))
                throw caught;
        }
        if (typed !== undefined)
            return normaliseV(typed);
    }
    let digest;
    try {
        digest = await signer.signDigest(what.digest);
    }
    catch (caught) {
        if (isUserRejection(caught) || !preferDigest)
            throw caught;
        return normaliseV(await signer.signTypedData(what.typedData));
    }
    return markAsMessage(digest);
}
/** EIP-1193 reserves 4001 for "the person said no". Matched on the code; messages are the wallet's. */
function isUserRejection(error) {
    if (typeof error !== "object" || error === null)
        return false;
    if (error.code === 4001)
        return true;
    const cause = error.cause;
    return cause !== undefined && cause !== error && isUserRejection(cause);
}
/** Lift a raw recovery id to the 27/28 `ecrecover` takes. Some signers return 0/1. */
function normaliseV(signature) {
    if (signature.length !== 132)
        throw new WalletResponseError(`A signature must be 65 bytes; this one is ${signature.length / 2 - 1}.`);
    const v = Number.parseInt(signature.slice(130), 16);
    if (v !== 0 && v !== 1)
        return signature;
    return `${signature.slice(0, 130)}${(v + 27).toString(16)}`;
}
/**
 *  Add Safe's `v + 4`, which is the only thing on the wire saying the digest was signed as a
 *  message rather than as typed data. Without it the contract recovers a real, wrong address.
 */
function markAsMessage(signature) {
    if (signature.length !== 132)
        throw new WalletResponseError(`A signature must be 65 bytes; this one is ${signature.length / 2 - 1}.`);
    const v = Number.parseInt(signature.slice(130), 16);
    const marked = v === 0 || v === 27 ? 31 : v === 1 || v === 28 ? 32 : null;
    if (marked === null)
        throw new WalletResponseError(`Unexpected recovery id: v=${v}.`);
    return `${signature.slice(0, 130)}${marked.toString(16)}`;
}
//# sourceMappingURL=submit.js.map