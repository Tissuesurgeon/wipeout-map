// Signing and sending as two decisions, joined in one place.
//
// The four combinations are all real and all in use: the owner EOA signs a new account and a
// relayer pays for it; the owner EOA signs and sends it itself; a session key signs a trade and a
// relayer sends it; a session key signs and sends. Nothing in the protocol ties the two roles
// together — `createAccountWithOwners` takes a signature as an argument and does not look at
// `msg.sender`, and `execTransaction` checks the signature blob rather than the caller — so an SDK
// that couples them is inventing a restriction the contracts do not have.
//
// What the two roles share is the middle: whoever signs, they sign one of a small number of known
// shapes, and whoever sends, they send the same call. So this module produces that middle as a
// value — the typed data to render, the digest to fall back to, and the function turning a
// signature into a call — and leaves both ends to the caller.
//
// **`toCall` is the piece worth having.** Between the signature and the transaction sits encoding
// that differs per flow: account creation packs the authorization struct around the signature,
// while execution wraps it once per account in the authority chain before it reaches
// `execTransaction`. Both have been written by hand in an app, and both were wrong at some point
// in a way that produced a well-formed signature the contract rejected with no useful error.
import { getAddress, hashTypedData } from "viem";
import { estimateGas, getBalance, getGasPrice } from "viem/actions";
import { accountAuthorizationPayload, createAccountWithOwnersCall, createAccountWithOwnersCalls, } from "./authorization.js";
import { signExecution } from "./execute.js";
import { createAccountsGasLimit, factoryAddress } from "./factory.js";
import { safeTxTypedData } from "./safe-tx.js";
import { signSubAccountCreation } from "./sub-accounts.js";
import { signWith, submitCall, } from "./submit.js";
import { SenderRequiredError, WrongSignerError, present } from "./errors.js";
/**
 *  Prepare a new account, for its owner to sign.
 *
 *  **The owner EOA signs this and nothing else can.** The authorization names `accountId` as the
 *  address the account derives from, and the factory recovers the signature against exactly that —
 *  so a session key cannot stand in here, however convenient that would be. A new account has no
 *  session key yet; that is what the authorization is for.
 *
 *  Who *sends* it is open, and usually a relayer. Pass the result to {@link signAndSubmit}, or
 *  keep the signature and let something else drain it.
 *
 *  @param args.authorization What the owner authorises. Build it with `buildAccountAuthorization`.
 *  @param args.chainId The chain this call targets. The signature is not bound to it — use
 *         {@link PreparedAccountCreation.toCalls} to reach several.
 *  @param args.saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The prepared creation.
 *  @throws {UnsupportedChainError} When nothing is committed for that chain.
 */
export function prepareAccountCreation(args) {
    const factory = factoryAddress(args.chainId, args.saltVersion);
    const typedData = accountAuthorizationPayload(factory, args.authorization);
    const signed = (signature) => ({ factory, authorization: args.authorization, signature });
    const call = (signature) => createAccountWithOwnersCall(args.chainId, signed(signature), args.saltVersion);
    return {
        typedData,
        digest: hashTypedData(typedData),
        signer: getAddress(args.authorization.accountId),
        factory,
        authorization: args.authorization,
        // **Fixed, not measured, and the one flow where that is right.** Safe's `setup()` runs nested
        // inside the factory's frame, so the 63/64 rule hands it a fraction of what REMAINS rather
        // than everything left in the transaction: it needs a floor of gas remaining, an estimate
        // measures gas spent, and no multiplier on the latter reliably clears the former. See
        // `CREATE_ACCOUNT_GAS_LIMIT`. Unspent gas is refunded; what this costs is the prefund the
        // sender holds while the transaction is in flight.
        //
        // Fixed per batch rather than one number for every batch: this authorization creates as many
        // accounts as it names indices, each with its own nested `setup`, so the floor is the
        // single-account one plus what the accounts before the last spent getting there. See
        // `createAccountsGasLimit`.
        gas: createAccountsGasLimit(args.authorization.indices.length),
        // No `chainId` in the domain — the whole point of the design — so every wallet can render it
        // and none of them has anything to validate it against.
        chainBound: false,
        toCall: call,
        toCalls: (signature, chainIds) => createAccountWithOwnersCalls(chainIds, signed(signature), args.saltVersion),
    };
}
/**
 *  Prepare an account's transaction, for whoever holds authority over it to sign.
 *
 *  The counterpart to {@link prepareAccountCreation} and the one used far more often: an account
 *  that exists acting, signed by whichever key the caller holds. Usually the session key, silently,
 *  which is the point of having granted one.
 *
 *  **The typed data follows the authority chain.** With no chain, the signer signs the account's
 *  own Safe transaction, which every wallet renders with the target and value visible. Through a
 *  parent, they sign the parent's approval of it — a `SafeMessage` wrapping the hash below — and a
 *  wallet can only show the hash, because that is genuinely all there is to show at that level.
 *
 *  @param plan From `planExecution`, which needs the account's nonce.
 *  @param signer The address that will sign. Recorded so a mismatch is caught before a chain sees
 *         it; the plan itself does not name a signer, since several keys may be able to.
 *  @returns The prepared execution.
 */
export function prepareExecution(plan, signer) {
    const outermost = plan.through[plan.through.length - 1];
    const typedData = outermost === undefined
        ? safeTxTypedData(plan.chainId, plan.account, plan.tx)
        : // The parent's message envelope, which is what `safeMessageHash` computes by hand. The
            // message is the hash below wrapped as a single `bytes32` word, exactly as the fallback
            // handler receives it.
            {
                domain: { chainId: plan.chainId, verifyingContract: outermost },
                types: { SafeMessage: [{ name: "message", type: "bytes" }] },
                primaryType: "SafeMessage",
                message: { message: approvedWord(plan) },
            };
    return {
        typedData,
        digest: plan.hash,
        signer: getAddress(signer),
        // Both shapes carry one: `SafeTx`'s domain and the parent's message domain are Safe's, and
        // Safe's binds the chain. An injected wallet on the wrong network refuses either.
        chainBound: true,
        gasFloor: EXECUTION_GAS_FLOOR,
        toCall: (signature) => signExecution(plan, signature),
    };
}
/**
 *  The least gas an execution is sent with, however little it measures.
 *
 *  A nested execution pays for an EIP-1271 staticcall per level, and Safe re-reads storage that
 *  the estimate saw warm. Getting this wrong is quiet in the worst way: the send succeeds, the
 *  hash is real, the receipt says failure and nothing moved — and on Somnia, where blocks are a
 *  second apart, the state an estimate measured against is routinely not the state it mines into.
 *
 *  Unspent gas is refunded, so the cost of being generous is the prefund held in flight, not gas
 *  burnt. The cost of being exact is a transaction that does nothing.
 */
export const EXECUTION_GAS_FLOOR = 2000000n;
/** The word a parent approves: the hash one level down, ABI-encoded as `bytes32`. */
function approvedWord(plan) {
    return present(plan.hashes[plan.hashes.length - 2], "a nested plan has a hash below the top");
}
/**
 *  Prepare a sub-account, for whoever holds authority over its parent to sign.
 *
 *  The third flow, and the one whose two hashes are easiest to confuse. A sub-account is
 *  authorised by the account that will own it, not by a key — so the factory checks its digest
 *  against the MAIN account via EIP-1271, and the main account checks a hash wrapped in its own
 *  message envelope against its owners. Those are different hashes, and signing the factory's one
 *  produces a signature that recovers to a real address and is refused with nothing on screen
 *  naming a hash. {@link SubAccountCreationPlan.hash} is the one a key signs; `digest` is the
 *  other one, and is carried for display.
 *
 *  Chain-bound despite the factory's digest not being: the envelope the parent wraps it in is
 *  Safe's, and Safe's domain has the chain id in it. That is why nested consent is per chain
 *  however chain-agnostic the thing being consented to.
 *
 *  @param plan From `planSubAccountCreation`.
 *  @param signer The address that will sign — a key with authority over the main account.
 *  @returns The prepared creation.
 */
export function prepareSubAccountCreation(plan, signer) {
    const outermost = plan.through[plan.through.length - 1] ?? plan.mainAccount;
    const below = plan.hashes[plan.hashes.length - 2] ?? plan.digest;
    return {
        typedData: {
            domain: { chainId: plan.chainId, verifyingContract: outermost },
            types: { SafeMessage: [{ name: "message", type: "bytes" }] },
            primaryType: "SafeMessage",
            message: { message: below },
        },
        digest: plan.hash,
        signer: getAddress(signer),
        chainBound: true,
        // One sub-account per plan, so this is the single-account limit — through the same function,
        // so it stays right if a plan ever names more than one.
        gas: createAccountsGasLimit(plan.authorization.indices.length),
        toCall: (signature) => signSubAccountCreation(plan, signature),
    };
}
/**
 *  Sign it with one party and send it with another — or with the same one.
 *
 *  The whole point of the split, as a single call: `signer` and `sender` are independent, so an
 *  owner EOA signing while a relayer pays, an owner EOA doing both, a session key signing while a
 *  relayer pays, and a session key doing both are the same line of code with different arguments.
 *
 *  Refuses when the signer is not the address the flow requires. That check is cheap here and
 *  expensive on chain, where the failure is `GS026` or a silent `InvalidAuthorization` and the
 *  gas is spent either way.
 *
 *  @param client A viem client for the target chain, used to measure gas and read the receipt.
 *  @param args.prepared What to sign.
 *  @param args.signer Whoever holds the key. May also be the sender.
 *  @param args.sender Whoever pays — a wallet or a {@link Relay}. Defaults to `signer` when it can
 *         pay, so the ordinary EOA-does-both case needs no second argument.
 *  @param args.chain The chain to send on.
 *  @param args.gas Overrides both the flow's own limit and measurement.
 *  @param args.describe How to name this transaction in an error.
 *  @returns The hash and block, once mined and successful.
 *  @throws {WrongSignerError} When `signer` is not the address the flow requires.
 *  @throws {SenderRequiredError} When no `sender` is given and `signer` cannot pay.
 *  @throws {TransactionRevertedError} When it mined and failed.
 *  @throws {UnconfirmedSendError} When it went out but no receipt came back. **Not a failure.**
 *  @throws {CannotPayError} When the sender's balance will not cover it.
 *  @throws {WalletResponseError} When the wallet answers with something unusable.
 *  @throws {RpcError} When the signer refused, or the transport failed.
 */
export async function signAndSubmit(client, args) {
    if (getAddress(args.signer.address) !== args.prepared.signer) {
        throw new WrongSignerError(args.prepared.signer, getAddress(args.signer.address));
    }
    const signature = await signWith(args.signer, {
        typedData: args.prepared.typedData,
        digest: args.prepared.digest,
        chainBound: args.prepared.chainBound,
    });
    const call = args.prepared.toCall(signature);
    const sender = args.sender ?? asSender(args.signer);
    const gas = args.gas ?? args.prepared.gas ?? (await measure(client, call, sender, args.prepared.gasFloor));
    const result = await submitCall(client, {
        chain: args.chain,
        sender,
        call,
        gas,
        ...(args.describe === undefined ? {} : { describe: args.describe }),
    });
    return { ...result, signature };
}
/**
 *  What an address would have left after paying for a call, and whether that is a negative number.
 *
 *  **Who pays is a fact about balances, not a preference.** The factory has no caller check and
 *  `execTransaction` checks signatures rather than `msg.sender`, so any funded address may pay for
 *  anything — which makes "who should pay" a question consumers answer by picking a favourite. The
 *  explorer picked `sessionSigner ?? ownerSigner` and billed a mainnet deploy to an embedded key
 *  holding nothing on that chain; what surfaced was the wallet's own parameter error, which reads
 *  as a broken call rather than as "no funds here".
 *
 *  **Asks the chain for the gas price rather than assuming one.** The alternative is a constant,
 *  and a constant has to be generous to be safe: the version this replaces required twenty million
 *  gas at twenty gwei — 0.4 of the native token — to green-light a create that actually costs a
 *  small fraction of that. Someone holding a tenth of a token, which is plenty, was told no key
 *  could pay.
 *
 *  @param client A viem client for the chain that would be paid on.
 *  @param args.address The address that would pay.
 *  @param args.gas The limit the transaction would carry. Unspent gas is refunded, but the whole
 *         limit must be covered while the transaction is in flight.
 *  @param args.value Native token sent along, if any.
 *  @returns The balance, what the send requires, and whether one covers the other.
 */
export async function canPayFor(client, args) {
    const address = getAddress(args.address);
    const [balance, gasPrice] = await Promise.all([
        getBalance(client, { address }),
        getGasPrice(client),
    ]);
    const required = args.gas * gasPrice + (args.value ?? 0n);
    return { affordable: balance >= required, balance, required, gasPrice };
}
/**
 *  The first of these addresses that can pay, or `null` when none can.
 *
 *  Reads them all rather than stopping at the first success, because the answer a caller usually
 *  wants next is "why not" — and `checked` is what distinguishes "nobody can pay" from "nobody has
 *  been asked yet". Rendering those two the same way is how a UI ends up telling someone their
 *  funded wallet is broke while the balance is still loading.
 *
 *  @param client A viem client for the chain that would be paid on.
 *  @param candidates The addresses that could pay, in order of preference.
 *  @param args.gas The limit the transaction would carry.
 *  @param args.value Native token sent along, if any.
 *  @returns The first affordable candidate and every candidate's numbers.
 */
export async function pickPayer(client, candidates, args) {
    const checked = await Promise.all(candidates.map(async (candidate) => {
        const { balance, required, affordable } = await canPayFor(client, {
            address: candidate.address,
            gas: args.gas,
            ...(args.value === undefined ? {} : { value: args.value }),
        });
        return { candidate, balance, required, affordable };
    }));
    return { payer: checked.find((c) => c.affordable)?.candidate ?? null, checked };
}
/**
 *  Use the signer as the sender, when it can pay.
 *
 *  A {@link SigningWallet} is both, so the common "my EOA signs and sends" case needs no second
 *  object — and a signer that is only a signer says so here rather than failing mid-send.
 */
function asSender(signer) {
    if (!canPay(signer)) {
        throw new SenderRequiredError(signer.address);
    }
    return signer;
}
/**
 *  Whether a signer can also pay.
 *
 *  Exported because a caller asking "do I need a relayer here?" is asking exactly this, and the
 *  alternative is each of them re-deriving it from the shape of an object.
 *
 *  @param signer Any signer.
 *  @returns Whether it is also a wallet that can send.
 */
export function canPay(signer) {
    return typeof signer.getProvider === "function";
}
/**
 *  Measure the gas a call needs, from the address that will actually pay.
 *
 *  **This is the SDK's gas policy, and it is exported so nobody has to copy it.** `signAndSubmit`
 *  applies it internally, but a caller that takes `prepared.toCall(signature)` and broadcasts the
 *  bytes itself never reaches that path — and a copied policy drifts, which here means an
 *  out-of-gas receipt on a call that used to work.
 *
 *  The policy is two rules:
 *
 *  - **A fifth over the estimate.** Safe's `execTransaction` re-reads storage the estimate saw
 *    warm, so an estimate that is exactly right fails the moment anything about the account
 *    changes between measuring and mining — which, at a block a second, it does.
 *  - **Never below `floor`.** Pass `prepared.gasFloor` for a prepared call. Safe's `setup` and
 *    `execTransaction` run nested, so EIP-150's 63/64 rule gives the inner frame a fraction of what
 *    REMAINS; those calls need a floor of gas remaining, an estimate measures gas spent, and no
 *    multiplier on the latter reliably clears the former.
 *
 *  **Estimated as the payer, not as anyone convenient.** The code's cost does not depend on the
 *  caller, but the node charges the estimate against the `from` balance, so estimating from an
 *  address that cannot afford it fails with an insufficient-funds error that reads as though the
 *  call itself is broken.
 *
 *  Omit `payer` for a relayer, which has no address to offer and is expected to have its own
 *  policy. It then gets an estimate with no `from`, padded and floored the same way.
 *
 *  Deliberately a function rather than a method on `Prepared`: a prepared call does not know who
 *  will pay for it — the sender is chosen at submit time — so `prepared.measureGas(client)` would
 *  have to estimate from nobody and quietly give a worse answer than this.
 *
 *  @param client Any viem client that can read.
 *  @param args.call The call to measure.
 *  @param args.payer Who will pay. Omit for a relayer.
 *  @param args.floor The lowest acceptable limit. `prepared.gasFloor` for a prepared call.
 *  @returns The limit to send.
 *  @throws When the estimate itself fails — a revert at estimation time is a real failure and is
 *          not padded into a number that would have reverted anyway.
 */
export async function measureGas(client, 
// `| undefined` on both, not just `?`. Under `exactOptionalPropertyTypes` those are different
// types, and the natural call is `{floor: prepared.gasFloor}` where `gasFloor` is itself
// optional — so requiring a conditional spread at every call site would be the API being awkward
// about its own shape. Caught by the README example failing to compile.
args) {
    const from = args.payer === undefined ? undefined : getAddress(args.payer);
    const measured = await estimateGas(client, {
        ...(from === undefined ? {} : { account: from }),
        to: args.call.to,
        value: args.call.value,
        data: args.call.data,
    });
    const padded = (measured * 12n) / 10n;
    return args.floor !== undefined && padded < args.floor ? args.floor : padded;
}
/** {@link measureGas}, taking the sender this module already holds. */
async function measure(client, call, sender, floor) {
    return measureGas(client, {
        call,
        payer: "address" in sender ? getAddress(sender.address) : undefined,
        floor,
    });
}
//# sourceMappingURL=prepare.js.map