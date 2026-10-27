import { type Abi, type Account, type Address, type Hex, type PublicClient } from "viem";
import type { Executor } from "./executor/types.js";
import * as WriterRuntime from "./writerRuntime.js";
import type { ClientConfig } from "./config.js";
import type { Debug } from "./debug.js";
import type { BinarySide } from "./store.js";
import type { TraderConfig, TxResult, PlaceOrderResult, PlaceOrderParams, AmendOrderResult, AmendOrdersResult } from "./trade.js";
export declare function farFutureNs(): bigint;
export declare const ZERO_BYTES32: Hex;
export declare const ZERO_ADDRESS: Address;
/**
 *  The collateral a buy locks, in raw collateral units — BinaryPool
 *  `_bidCommitment`: `ceil(quantity × unitPrice / oneCollateral)` plus, when the
 *  order carries a builder fee, that fee's ceil-rounded headroom on the
 *  principal. The pool locks (and pulls) both. This is the one definition; the
 *  writer's escrow and the facade's collateral pre-check must both use it so
 *  the pre-check predicts the number the pool will pull.
 *
 *  `unitPrice` is the cost of one whole outcome token for the side being bought
 *  (the YES price for BUY_YES, `oneCollateral − yesPrice` for BUY_NO). With a
 *  rate of `0n` this is the exact integer principal; the facade pre-check uses
 *  that form for a spot bid's bare quote principal (`oneCollateral` = one whole
 *  base unit, no fee headroom — the writer's spot path asks the pool instead).
 */
export declare function bidCommitment(quantity: bigint, unitPrice: bigint, oneCollateral: bigint, builderFeeBpsTimes1k?: bigint): bigint;
/**
 *  What a placement escrows: collateral for a buy (ceil-rounded), or an outcome
 *  position for a sell (moved under the one-time ERC-6909 operator approval).
 */
export type Escrow = {
    kind: "erc20";
    token: Address;
    amount: bigint;
} | {
    kind: "erc6909";
    outcomeToken: Address;
    id: bigint;
    amount: bigint;
};
/**
 *  v2 OrderKind enum for `placeBinaryOrder` (0 BUY_YES, 1 SELL_YES, 2 BUY_NO,
 *  3 SELL_NO) — the side is explicit, NOT encoded in userData. The pool maps kind
 *  onto the base book's (isBid, price) internally; the SDK just forwards the enum.
 *
 * @category trading
 */
export declare const ORDER_KIND: Record<BinarySide, number>;
/** One contract write, as the send path sees it. */
export interface WriteCall {
    address: Address;
    abi: Abi;
    functionName: string;
    args: readonly unknown[];
    gas?: bigint;
    value?: bigint;
}
/**
 *  A write gathered but NOT yet sent — an approval or an operator grant the write
 *  it enables depends on. The funnel sends it in the SAME `executor.execute`
 *  call as that write (one safe transaction through MultiSend; one transaction
 *  each, in order, for an executor that cannot batch) and runs `commit` once it
 *  has landed, so the approval caches only remember what is on chain.
 *
 * @internal
 */
export interface Prerequisite {
    call: WriteCall;
    commit: () => void;
}
/**
 *  One unsigned call, ready for any signer: spread into viem's `sendTransaction`,
 *  wrap as an ERC-4337 UserOp call field, or hand to a relayer.
 *
 *  Deliberately minimal, following `BridgeTransaction` in the `/chains` bridge
 *  module: no nonce, no fees, no gas — those are the signer's job, and pinning
 *  them here would stale the moment the call is cached. `description` is a human
 *  label for a confirmation UI.
 *
 *  `chainId` names the chain the call must be executed on. An exchange that
 *  spans several chains hands back calls for markets on any of them, and an
 *  {@link Executor} bound to another chain refuses a call whose `chainId` is
 *  not its own. Note `value` is a `bigint`, so `JSON.stringify` throws on it —
 *  convert it yourself if the call crosses a serialization boundary.
 *
 * @category trading
 */
export interface UnsignedCall {
    /** Numeric chain id the call must be sent on. */
    chainId: number;
    /** Contract to call. */
    to: Address;
    /** ABI-encoded calldata. */
    data: Hex;
    /** Native value to attach, in wei. `0n` unless the call pays native. */
    value: bigint;
    /** What this call does, for a UI to label a confirmation with. */
    description: string;
    /**
     *  The contract function the calldata encodes (`"approve"`, `"placeOrder"`, …),
     *  for error messages: an executor names it in the revert it raises for THIS
     *  call. Set on every call the SDK builds; optional so a call assembled by
     *  hand still executes.
     */
    functionName?: string;
}
/**
 * Converts a {@link WriteCall} to an unsigned transaction request.
 *
 *  Lives here rather than beside any one build verb because several modules
 *  (`perp/stops.ts`, `perp/margin.ts`, `orders.ts`) encode through it, and the
 *  point of a build verb is that its bytes cannot diverge from what the sending
 *  twin puts on the wire — one encoder keeps that true.
 *
 * @internal
 */
export declare function toUnsigned(chainId: number, call: WriteCall, description: string): UnsignedCall;
/**
 * Builds the ERC-20 approval that a write needs as an unsigned call.
 *
 *  `maxUint256`, as the send path's `approveIfNeeded` uses — so the two agree, and
 *  a caller who batches this once is not asked again.
 *
 * @internal
 */
export declare function approvalCall(chainId: number, token: Address, spender: Address, description: string): UnsignedCall;
/**
 *  A placement expanded into the unsigned calls it actually takes.
 *
 *  Two or one: a placement that escrows an ERC-20 (or outcome tokens) needs an
 *  approval before the order call, while a native-base sell and every perp
 *  placement need only the order. `approval` is simply absent when there is
 *  nothing to approve — branching on it narrows:
 *
 * **Example** (Sending an unsigned order)
 *
 * ```ts
 * const { order, approval } = await trader.buildPlaceOrder(params);
 * if (approval) await walletClient.sendTransaction({ ...approval, account });
 * await walletClient.sendTransaction({ ...order, account });
 * ```
 *
 *  The approval is RETURNED, never sent — unlike `placeOrder`, which sends it as
 *  a side effect. A caller who skips a needed approval gets an on-chain revert,
 *  so check `approval` rather than assuming it is handled.
 *
 *  `approval` is present whenever the placement escrows something, without
 *  checking the current allowance (that check is an `eth_call`, which a
 *  build-only verb should not make) — so it may be redundant, never short: it
 *  approves `maxUint256`, as the send path does. (A token that demands its
 *  allowance be zeroed before being re-set would reject that, same as on the send
 *  path.) Pass `autoApprove: false` to drop it and skip the escrow lookup.
 *
 * @category trading
 */
export interface UnsignedOrder {
    /** The placement call itself. */
    order: UnsignedCall;
    /** The approval the placement needs first; absent when nothing needs approving. */
    approval?: UnsignedCall;
}
/** A pool's escrow tokens, outcome IDs, and exact collateral scale. */
export interface PoolTokens {
    /** ERC-6909 outcome-token singleton (shared across all markets). */
    outcomeToken: Address;
    /** This pool's YES/NO position ids on the singleton. */
    yesId: bigint;
    noId: bigint;
    collateral: Address;
    /** `10 ** collateral.decimals()`, as used by BinaryPool commitment math. */
    oneCollateral: bigint;
}
/**
 * Infrastructure that binds a writer to its owning client.
 *
 * `createClient()`
 *  passes its own so writes share that client's chain, fees, addresses, and
 *  WebSocket.
 *
 * @internal
 */
export interface WriterDeps {
    getConfig: () => ClientConfig;
    getClient: () => PublicClient;
    /** The current owner lifecycle, captured before each write starts. */
    getReceiptSignal?: () => AbortSignal | undefined;
    /**
     * The owning client's debug channel. It defaults to a no-op when absent.
     *
     * @internal
     */
    dbg?: Debug;
    /**
     *  Writer state shared by every trader derived from the same configured owner:
     *  the engine's nonce lane and its local-send ordering. Each engine keeps its
     *  own, so two engines on two chains with the same key never share a sequence.
     *  Absent only for a writer built outside an engine (tests); a fresh runtime
     *  is made then.
     */
    writerRuntime?: WriterRuntime.WriterRuntime;
}
/**
 *  The chain-write capability every concept write takes as its first parameter.
 *
 *  **Details**
 *
 *  Members are exactly what the write verbs were capturing as closures — the send
 *  funnel (`execute`/`executeOrder`), the idempotent approval + operator grants,
 *  the cached pool/bank/token resolvers, and the config a write needs (gas, fees,
 *  decimals, addresses, signer). Nothing here is a convenience: each member has a
 *  measured call site among the verbs.
 */
export interface Writer {
    /**
     *  Send one write — after any `prerequisites`, in the same executor call — and
     *  await its receipt; a revert throws {@link ContractRevertError}.
     */
    execute(call: WriteCall, prerequisites?: readonly Prerequisite[]): Promise<TxResult>;
    /** {@link execute} plus order-id/fill decoding from the receipt logs. */
    executeOrder(call: WriteCall, prerequisites?: readonly Prerequisite[]): Promise<PlaceOrderResult>;
    /** Escrow tokens for a pool (cached per pool+nonce). */
    poolTokens(pool: Address, nonceOverride?: bigint): Promise<PoolTokens>;
    /** {@link poolTokens} for a placement, honoring explicit param overrides. */
    tokens(p: PlaceOrderParams): Promise<PoolTokens>;
    /** The pool's market expiry (orders must not outlive the market). */
    marketExpiryNs(pool: Address): Promise<bigint>;
    /** Which token+amount a placement escrows, from its side and the pool's tokens. */
    escrow(p: PlaceOrderParams, tokens: PoolTokens): Escrow;
    /**
     *  The approval of `spender` for `token` the next write needs, or `undefined`
     *  when the allowance already covers `amount` (cached per pair). Not sent:
     *  hand it to {@link execute} / {@link executeOrder} as a prerequisite so it
     *  rides in the same executor call as the write it enables. `amount` may be a
     *  thunk: it is only resolved when the pair is not cached, so a caller can
     *  price the pool's exact worst-case pull (principal + fee headroom) without
     *  paying that read on the hot path.
     */
    approvalIfNeeded(token: Address, spender: Address, amount: bigint | (() => Promise<bigint>), gas: bigint): Promise<Prerequisite | undefined>;
    /**
     *  The one-time ERC-6909 operator grant of `spender` on `outcomeToken` the
     *  next write needs, or `undefined` when it is already held (cached per pair).
     *  Not sent — a prerequisite, like {@link approvalIfNeeded}.
     */
    operatorGrantIfNeeded(outcomeToken: Address, spender: Address, gas: bigint): Promise<Prerequisite | undefined>;
    /** Forget cached approvals — call after an external revoke. */
    clearApprovalCache(token?: Address, spender?: Address): void;
    /** The pool's collateral token (explicit override wins). */
    poolCollateral(pool: Address, override?: Address): Promise<Address>;
    /** The margin bank for a perp write, from `marginBank` or the pool. */
    resolveMarginBank(p: {
        marginBank?: Address;
        pool?: Address;
    }): Promise<Address>;
    /** A margin bank's collateral token (explicit override wins). */
    bankCollateral(bank: Address, override?: Address): Promise<Address>;
    /**
     *  A margin bank's LinkedWalletRegistry (explicit override wins), or
     *  {@link NotConfiguredError} when the bank holds none.
     *
     *  Deliberately NOT cached, unlike {@link bankCollateral}. The bank's collateral
     *  token is immutable, but the registry is rotatable by the bank's owner
     *  (`setLinkedWalletRegistry`), and a cached one would keep sending consent writes
     *  to a registry the bank has stopped reading. These writes are onboarding
     *  actions rather than a hot path, so the read costs nothing that matters.
     */
    bankLinkedWalletRegistry(bank: Address, override?: Address): Promise<Address>;
    /**
     *  A margin bank's credit granter, the VoucherDistributor (explicit override
     *  wins), or {@link NotConfiguredError} when the bank holds none.
     *
     *  Not cached, for the same reason as {@link bankLinkedWalletRegistry}: the
     *  bank's owner can rotate the granter (`setCreditGranter`), and a claim sent to
     *  a rotated-out distributor reverts in the bank's `onlyCreditGranter` check.
     */
    bankCreditGranter(bank: Address, override?: Address): Promise<Address>;
    /** CollateralRouter address, or {@link NotConfiguredError}. */
    resolveRouter(override?: Address): Address;
    /** BinaryMarketsModule address, or {@link NotConfiguredError}. */
    resolveModule(override?: Address): Address;
    /** BinarySettlement address, or {@link NotConfiguredError}. */
    resolveSettlement(override?: Address): Address;
    /** OperatorPermissionsRegistry address, or {@link NotConfiguredError}. */
    resolveOperatorRegistry(override?: Address, attempting?: string): Address;
    /** The settlement singleton's outcome token (cached — immutable). */
    settlementOutcomeToken(settlement: Address): Promise<Address>;
    /**
     *  The executor every write goes through — who signs and sends, and the
     *  address the pools see as the caller.
     */
    readonly executor: Executor;
    /** The wrapped public client (chain reads reject with SDK errors). */
    readonly publicClient: PublicClient;
    /** Live addresses from the owning client's config. */
    readonly addresses: () => NonNullable<ClientConfig["addresses"]>;
    /** The signing account (or its address, for an external wallet). */
    readonly from: Account | Address;
    /** The signer's address. */
    readonly fromAddress: Address;
    /** The chain writes are sent to. */
    readonly chain: NonNullable<ClientConfig["chain"]>;
    /** Default gas ceiling per write. */
    readonly defaultGas: bigint;
    /** 10^decimals — one whole unit in raw terms. */
    readonly oneBase: bigint;
    /** Collateral/outcome decimals for this client. */
    readonly decimals: number;
    /** The owning client's debug channel. */
    readonly dbg: Debug;
}
/**
 * Reconstructs a batch amendment's replacement identifiers from its receipt.
 * Delegates to the pure {@link decodeAmendOrders}; kept here so the amend verbs
 * keep one import.
 *
 * @internal
 */
export declare function decodeBatchAmendResult(result: TxResult, { pool, amendmentCount }: {
    pool: Address;
    amendmentCount: number;
}): AmendOrdersResult;
/**
 * Reconstructs one amendment's outcome from its receipt. Delegates to the pure
 * {@link decodeAmendOrder}.
 *
 * @internal
 */
export declare function decodeAmendResult(result: TxResult, { pool }: {
    pool: Address;
}): AmendOrderResult;
/**
 * Builds the write context for a signer and its owning client's dependencies. Public entry
 *  is `client.createTrader(...)`, which builds one of these and binds the verbs.
 *
 * @internal
 */
export declare function createWriter(config: TraderConfig, deps: WriterDeps): Writer;
