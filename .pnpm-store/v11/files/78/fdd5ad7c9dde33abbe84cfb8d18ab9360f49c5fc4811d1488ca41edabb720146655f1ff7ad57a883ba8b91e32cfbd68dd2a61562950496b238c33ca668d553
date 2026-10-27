import { type Abi, type Address, type Chain, type Client, type Hex, type TransactionReceipt } from "viem";
import { type Call } from "./call.js";
/**
 *  The EIP-1193 surface this module uses.
 *
 *  Deliberately structural rather than viem's `EIP1193Provider`: that type declares `on` and
 *  `removeListener` with generic event maps, and wallet SDKs type those differently, so requiring
 *  it pushes every caller into a cast at exactly the boundary where a mistake is invisible.
 *  Nothing here subscribes to events.
 */
export interface WalletRequester {
    request: (args: {
        method: string;
        params?: unknown[];
    }) => Promise<unknown>;
}
/** A wallet that can pay for a transaction. */
export interface PayingWallet {
    /** The address that pays, and that the transaction is sent `from`. */
    readonly address: Address;
    /** Called per send rather than held: a provider bound to a stale session fails obscurely. */
    readonly getProvider: () => Promise<WalletRequester>;
    /**
     *  Whether this is a wallet the user brought, as opposed to an embedded key.
     *
     *  **The single most consequential field here.** It decides which RPC method is used, and the
     *  wrong one does not degrade — it throws "Missing or invalid parameters" from inside the
     *  wallet, which reads as a bug in the app. Default `false`, because an embedded key is the one
     *  a caller is least likely to think about.
     */
    readonly external?: boolean;
}
/**
 *  Somewhere else that will broadcast for you.
 *
 *  **One method, because one method is all a relayer is.** Everything the SDK builds ends in a
 *  `Call` — `createAccountWithOwnersCall`, `signExecution`, `createAccountCall` — and a `Call` is
 *  already "here are the bytes, send them however you like". What was missing was a way to say
 *  *elsewhere*: `submitCall` could only be the sender itself, so a sponsor endpoint, a queue or a
 *  test double had no way in, and the one consumer that needs sponsorship could not use the SDK
 *  for it at all.
 *
 *  Deliberately not given the wallet's shape. A relayer has no address the caller knows, no
 *  provider, and nothing to check a network against — it is asked to put bytes on a chain and to
 *  say which transaction that became. Everything after that (waiting, revert detection, the
 *  unconfirmed case) stays in the SDK, because those are wrong in exactly the same three ways
 *  whoever broadcast.
 */
export interface Relay {
    /**
     *  Broadcast `call` on `chainId` and return the transaction it became.
     *
     *  May take as long as it likes and may reject; a rejection is the caller's to render. It must
     *  NOT wait for a receipt — that is `submitCall`'s job, and a relayer that waits hides the
     *  distinction between "reverted" and "not confirmed yet" that the caller depends on.
     *
     *  @param call The bytes to put on chain.
     *  @param chainId The chain to put them on.
     *  @param hints What the SDK already worked out about this call. Optional so an existing
     *         two-argument `send` still satisfies this interface — see {@link RelayHints} for why
     *         ignoring the gas hint is usually the wrong default.
     */
    send(call: Call, chainId: number, hints?: RelayHints): Promise<Hex>;
}
/**
 *  What the SDK knows about a call, handed to a relayer that is about to send it.
 *
 *  **These are the numbers the SDK already paid for.** A relayer that ignores them repeats the
 *  work, and for gas it usually cannot repeat it correctly.
 */
export interface RelayHints {
    /**
     *  The gas limit this call needs.
     *
     *  **Not an estimate, and usually not something a relayer can derive.** Safe's `setup` and
     *  `execTransaction` run nested, so EIP-150's 63/64 rule hands the inner frame a fraction of what
     *  REMAINS rather than everything left in the transaction: these calls need a floor of gas
     *  remaining, while `eth_estimateGas` measures gas spent, and no multiplier on the latter
     *  reliably clears the former. Account creation carries a measured 20,000,000 for that reason.
     *
     *  A relayer that hardcodes a limit instead — 2,500,000 is a natural guess — silently fails every
     *  account creation, and the receipt says out-of-gas rather than naming the cause. Use this value
     *  unless you have a policy that must cap it, and if you cap it, cap it above the floor.
     */
    readonly gas: bigint;
}
/** Whoever puts the transaction on chain: a wallet you hold, or somewhere that does it for you. */
export type Sender = PayingWallet | Relay;
/** What a submitted transaction did. */
export interface SubmitResult {
    readonly hash: Hex;
    /** The block it landed in, for a caller that wants to say so. */
    readonly blockNumber: bigint;
    /**
     *  The mined receipt, as it came back.
     *
     *  **Carried rather than dropped so a caller never fetches it twice.** Everything a consumer
     *  wants out of a Safe execution beyond "did it work" is in `logs` — the id a contract assigned,
     *  the events a batch emitted — and this function already waited for the receipt to decide
     *  success. Returning only the hash forced a second `eth_getTransactionReceipt` for a value
     *  that was in hand, on a path where the caller has already waited once.
     */
    readonly receipt: TransactionReceipt;
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
export declare function submitCall(client: Client, args: {
    chain: Chain;
    /** A wallet you hold, or a relayer that broadcasts for you. */
    sender: Sender;
    call: Call;
    gas: bigint;
    describe?: string;
    /**
     *  Additional error ABIs, so a revert in a protocol's own contracts can be named rather than
     *  reported as an unknown selector. The SDK knows Solidity's and ERC-20's; it cannot know
     *  yours.
     */
    errors?: Abi;
}): Promise<SubmitResult>;
/**
 *  Who signs, as one thing the SDK can ask rather than a method each consumer picks.
 *
 *  **The SDK never signs and never should** — it has no keys, no wallet and no session. What it
 *  does know, and what a consumer keeps getting wrong, is *which shape a signature has to be in*
 *  for the contract to accept it: typed data or a digest signed as a message, Safe's `v + 4`
 *  marker distinguishing the second, a raw recovery id that must be lifted to 27/28 or `ECDSA`
 *  rejects an otherwise valid signature, and a wallet that refuses one method needing the other.
 *  That is protocol knowledge, and it currently lives in six functions in one app.
 *
 *  So: a consumer implements two methods against whatever wallet it has, and the SDK owns the
 *  shape. `signWith` below turns "here is a digest" into "here is a signature the contract will
 *  take".
 */
export interface Signer {
    /** The address the signature must recover to. */
    readonly address: Address;
    /**
     *  Sign EIP-712 typed data.
     *
     *  May reject — some wallets refuse a domain they cannot validate, which is exactly what the
     *  chain-agnostic authorization domain is. `signWith` falls back to {@link Signer.signDigest}.
     */
    signTypedData(payload: unknown): Promise<Hex>;
    /**
     *  Sign 32 opaque bytes, the `personal_sign` way.
     *
     *  Universal, and the reason the fallback works: a wallet has nothing to validate in a hash.
     *  The `\x19Ethereum Signed Message` prefix is applied by the wallet; `signWith` marks the
     *  result so the contract knows which hash was signed.
     */
    signDigest(digest: Hex): Promise<Hex>;
    /** Whether this is a wallet the user brought. Decides which method is tried first. */
    readonly external?: boolean;
}
/**
 *  A wallet that both signs and sends — the ordinary case for an EOA.
 *
 *  **Being able to do both is the point.** Signing and sending are separate decisions, so the
 *  types are separate; but one EOA very often makes both, and requiring a consumer to construct
 *  two objects for one key would be a tax on the common case. An intersection rather than a third
 *  interface: it is exactly "a thing that is both", with nothing new to learn.
 */
export type SigningWallet = Signer & PayingWallet;
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
export declare function signWith(signer: Signer, what: {
    typedData: unknown;
    digest: Hex;
    chainBound?: boolean;
}): Promise<Hex>;
//# sourceMappingURL=submit.d.ts.map