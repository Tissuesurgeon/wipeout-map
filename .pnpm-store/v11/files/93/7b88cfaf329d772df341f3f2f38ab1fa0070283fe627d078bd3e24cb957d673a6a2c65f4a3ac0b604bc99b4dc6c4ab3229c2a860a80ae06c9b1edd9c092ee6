import { type Address, type Chain, type Client, type Hex } from "viem";
import { type AccountAuthorization } from "./authorization.js";
import type { Call } from "./call.js";
import { type ExecutionPlan } from "./execute.js";
import { type SubAccountCreationPlan } from "./sub-accounts.js";
import { type Sender, type Signer, type SigningWallet, type SubmitResult } from "./submit.js";
/**
 *  Something signed but not yet sent.
 *
 *  Deliberately inert. A caller can hold one across a page reload, hand it to a wallet that lives
 *  in another window, or serialise the resulting signature into a queue for a relayer to drain —
 *  none of which is possible when signing and sending are one function call.
 */
export interface Prepared {
    /** The EIP-712 payload to put in front of a wallet. */
    readonly typedData: unknown;
    /** The same thing as 32 bytes, for a wallet that will not render the payload. */
    readonly digest: Hex;
    /** The address the signature must recover to. Checked before sending, not after. */
    readonly signer: Address;
    /** A gas limit where the flow knows one. Absent means measure it. */
    readonly gas?: bigint;
    /**
     *  A floor under a measured limit, where the flow knows one.
     *
     *  Distinct from {@link Prepared.gas}, which replaces measurement entirely. A floor keeps
     *  measurement — so a large batch still gets what it needs — while refusing to go below a level
     *  the flow knows is unsafe.
     */
    readonly gasFloor?: bigint;
    /**
     *  Whether {@link Prepared.typedData} names a `chainId`.
     *
     *  Decides what an injected wallet is asked for: one that does gets the digest, because such a
     *  wallet refuses typed data for any chain but its selected one. One that does not gets the
     *  typed data, so the person can read what they are approving.
     */
    readonly chainBound: boolean;
    /**
     *  Turn a signature into the transaction that carries it.
     *
     *  @param signature 65 bytes from {@link signWith}, or an EIP-1271 blob.
     *  @returns The call, aimed at the contract that must receive it.
     */
    toCall(signature: Hex): Call;
}
/**
 *  A {@link Prepared} account creation — as many accounts as the authorization names, which one
 *  signature can settle on every chain.
 */
export interface PreparedAccountCreation extends Prepared {
    /** What was signed. */
    readonly authorization: AccountAuthorization;
    /** The factory the signature is bound to. The same address on every chain. */
    readonly factory: Address;
    /**
     *  The same signature as one call per chain.
     *
     *  The reason the domain omits `chainId`: this is one signature, fanned out. Returned as data
     *  rather than sent, because each chain needs its own funded sender and a chain that fails is
     *  retried rather than rolling the others back.
     *
     *  @param signature The authorization's signature.
     *  @param chainIds The chains to reach.
     *  @returns One call per chain, in the order given.
     */
    toCalls(signature: Hex, chainIds: readonly number[]): readonly (Call & {
        readonly chainId: number;
    })[];
}
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
export declare function prepareAccountCreation(args: {
    authorization: AccountAuthorization;
    chainId: number;
    saltVersion?: string;
}): PreparedAccountCreation;
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
export declare function prepareExecution(plan: ExecutionPlan, signer: Address): Prepared;
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
export declare const EXECUTION_GAS_FLOOR = 2000000n;
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
export declare function prepareSubAccountCreation(plan: SubAccountCreationPlan, signer: Address): Prepared;
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
export declare function signAndSubmit(client: Client, args: {
    prepared: Prepared;
    signer: Signer;
    sender?: Sender;
    chain: Chain;
    gas?: bigint;
    describe?: string;
}): Promise<SubmitResult & {
    readonly signature: Hex;
}>;
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
export declare function canPayFor(client: Client, args: {
    address: Address;
    gas: bigint;
    value?: bigint;
}): Promise<{
    readonly affordable: boolean;
    readonly balance: bigint;
    readonly required: bigint;
    readonly gasPrice: bigint;
}>;
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
export declare function pickPayer<T extends {
    address: Address;
}>(client: Client, candidates: readonly T[], args: {
    gas: bigint;
    value?: bigint;
}): Promise<{
    readonly payer: T | null;
    readonly checked: readonly {
        readonly candidate: T;
        readonly balance: bigint;
        readonly required: bigint;
    }[];
}>;
/**
 *  Whether a signer can also pay.
 *
 *  Exported because a caller asking "do I need a relayer here?" is asking exactly this, and the
 *  alternative is each of them re-deriving it from the shape of an object.
 *
 *  @param signer Any signer.
 *  @returns Whether it is also a wallet that can send.
 */
export declare function canPay(signer: Signer): signer is SigningWallet;
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
export declare function measureGas(client: Client, args: {
    call: Call;
    payer?: Address | undefined;
    floor?: bigint | undefined;
}): Promise<bigint>;
//# sourceMappingURL=prepare.d.ts.map