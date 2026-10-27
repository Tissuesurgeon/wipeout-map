import type { SomniaMarketsSocketFailure } from "../config.js";
import { type Address, type PublicClient } from "viem";
import type { WriterRuntime } from "../writerRuntime.js";
import type { ClientConfig } from "../config.js";
import type { MachineryAdminConfig } from "../machineryWriter.js";
import type { TxResult } from "../trade.js";
import type { LendAddresses } from "./types.js";
/**
 *  Signer config for the lend entry's `createLender` — same signer doctrine as
 *  every SDK write surface (a `privateKey`, a local `account`, or a browser
 *  `walletClient`).
 *
 * @category lending
 */
export type LenderConfig = MachineryAdminConfig;
/**
 * Options shared by the ERC-20 lend writes.
 *
 * @category lending
 */
export interface LendWriteOptions {
    /**
     *  Auto-approve the token pull when the allowance is short (default true) —
     *  same doctrine as the trader: one allowance read per (token, spender) pair,
     *  approve `maxUint256` once, cache the grant for the lender's lifetime.
     */
    approve?: boolean;
    /** Per-call gas ceiling override. */
    gas?: bigint;
}
/**
 * Options for {@link Lender.supply}.
 *
 * @category lending
 */
export interface LendSupplyOptions extends LendWriteOptions {
    /** Credit the position to another address (default: the signer). */
    onBehalfOf?: Address;
}
/**
 * Options for {@link Lender.withdraw}.
 *
 * @category lending
 */
export interface LendWithdrawOptions {
    /** Send the withdrawn tokens to another address (default: the signer). */
    to?: Address;
    /** Per-call gas ceiling override. */
    gas?: bigint;
}
/**
 * Options for {@link Lender.repay}.
 *
 * @category lending
 */
export interface LendRepayOptions extends LendWriteOptions {
    /** Repay another address's debt (default: the signer's own). */
    onBehalfOf?: Address;
}
/**
 * Write surface for the SomniaLend money market, bound to one signer — built by
 * `client.lend.createLender` on the owning client.
 *
 * **Details**
 *
 * Every method resolves once the tx is MINED, with its receipt. Amounts are raw
 * underlying-token units. ERC-20 pulls (supply / repay) auto-approve by default;
 * the `*Native` variants route native SOMI through the WrappedTokenGateway so
 * the caller never touches WSOMI.
 *
 * **Gotchas**
 *
 * Every method throws `ContractRevertError` if the chain rejected the action —
 * including a mined tx with `receipt.status: "reverted"`, whose reason is
 * recovered by replaying the call at that block when the node still has the
 * state — and `RpcError` when the send or the receipt read does not complete. A
 * reverted lend action never resolves as success. The `*Native` variants
 * need `wrappedTokenGateway` in the lend addresses. Borrowing is variable-rate
 * only. Position/risk reads live on the lend client (`getAccount`), not here.
 *
 * @category lending
 */
export interface Lender {
    /** The signer address the lender acts as. */
    readonly account: Address;
    /**
     * Supply `amount` of `asset` to earn interest (and optionally back borrows).
     * Auto-approves the Pool when the allowance is short.
     *
     * **Details**
     *
     * - `asset`: Underlying ERC-20 to supply (a {@link LendReserve}.underlying).
     * - `amount`: Raw underlying units.
     * - `opts`: Approval/gas overrides, or supply on behalf of another address.
     *
     * **Example** (Supplying an ERC-20)
     *
     * ```ts
     * const lender = client.lend.createLender({ privateKey });
     * await lender.supply(usdso, 1_000n * 10n ** 18n);
     * ```
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A broadcast transaction was not confirmed before the receipt wait failed, expired or stopped. Check its hash before retrying. Supplied typed failures retain identity.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    supply(asset: Address, amount: bigint, opts?: LendSupplyOptions): Promise<TxResult>;
    /**
     * Withdraw supplied `asset`. Pass `maxUint256` as `amount` to withdraw the
     * full balance including accrued interest. See {@link Lender.supply}.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A broadcast transaction was not confirmed before the receipt wait failed, expired or stopped. Check its hash before retrying. Supplied typed failures retain identity.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    withdraw(asset: Address, amount: bigint, opts?: LendWithdrawOptions): Promise<TxResult>;
    /**
     * Borrow `asset` against the account's collateral (variable rate). Reverts
     * on-chain if the health factor would drop below 1. See {@link Lender.supply}.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A broadcast transaction was not confirmed before the receipt wait failed, expired or stopped. Check its hash before retrying. Supplied typed failures retain identity.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    borrow(asset: Address, amount: bigint, opts?: {
        gas?: bigint;
    }): Promise<TxResult>;
    /**
     * Repay variable-rate debt in `asset`. Pass `maxUint256` as `amount` to clear
     * the full debt including accrued interest (requires balance ≥ debt; the
     * contract only pulls what is owed). See {@link Lender.supply}.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A broadcast transaction was not confirmed before the receipt wait failed, expired or stopped. Check its hash before retrying. Supplied typed failures retain identity.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    repay(asset: Address, amount: bigint, opts?: LendRepayOptions): Promise<TxResult>;
    /**
     * Toggle whether the supplied `asset` balance backs borrows. Disabling
     * reverts on-chain if it would leave existing debt under-collateralized.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A broadcast transaction was not confirmed before the receipt wait failed, expired or stopped. Check its hash before retrying. Supplied typed failures retain identity.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    setUseAsCollateral(asset: Address, useAsCollateral: boolean, opts?: {
        gas?: bigint;
    }): Promise<TxResult>;
    /**
     * Supply native SOMI (wrapped to WSOMI by the gateway). Sibling of
     * {@link Lender.supply}; needs `addresses.lend.wrappedTokenGateway`.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A broadcast transaction was not confirmed before the receipt wait failed, expired or stopped. Check its hash before retrying. Supplied typed failures retain identity.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    supplyNative(amount: bigint, opts?: {
        onBehalfOf?: Address;
        gas?: bigint;
    }): Promise<TxResult>;
    /**
     * Withdraw the WSOMI position as native SOMI. `maxUint256` withdraws all.
     * Auto-approves the gateway to pull the aWSOMI (an ERC-20 approve on the
     * aToken). Sibling of {@link Lender.withdraw}.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A broadcast transaction was not confirmed before the receipt wait failed, expired or stopped. Check its hash before retrying. Supplied typed failures retain identity.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    withdrawNative(amount: bigint, opts?: LendWithdrawOptions & {
        approve?: boolean;
    }): Promise<TxResult>;
    /**
     * Borrow native SOMI (variable rate) via the gateway. First-use grants the
     * gateway credit delegation on the WSOMI variable-debt token
     * (`approveDelegation`, cached like approvals). Sibling of {@link Lender.borrow}.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A broadcast transaction was not confirmed before the receipt wait failed, expired or stopped. Check its hash before retrying. Supplied typed failures retain identity.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    borrowNative(amount: bigint, opts?: {
        approve?: boolean;
        gas?: bigint;
    }): Promise<TxResult>;
    /**
     * Repay WSOMI debt with native SOMI. `maxUint256` is not supported for the
     * native path — pass a slight overpayment instead; the gateway refunds the
     * excess. Sibling of {@link Lender.repay}.
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A broadcast transaction was not confirmed before the receipt wait failed, expired or stopped. Check its hash before retrying. Supplied typed failures retain identity.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained.
     */
    repayNative(amount: bigint, opts?: {
        onBehalfOf?: Address;
        gas?: bigint;
    }): Promise<TxResult>;
    /**
     * Drop the lender's in-memory approval/delegation grant cache (mirrors the
     * trader's `clearApprovalCache`) — needed only if an approval was revoked
     * out-of-band while this lender instance is alive.
     */
    clearApprovalCache(): void;
}
/** Internal deps the lend entry (`client.lend`) hands the lender factory. */
export interface LenderDeps {
    getConfig: () => ClientConfig;
    getClient: () => PublicClient;
    /** The current owner lifecycle, captured before each write starts. */
    getReceiptSignal?: () => AbortSignal | undefined;
    addresses: LendAddresses;
    writerRuntime?: WriterRuntime;
}
/** Build a {@link Lender} (wired by the lend entry — use `lend.createLender`). */
export declare function createLenderWithDeps(config: LenderConfig, deps: LenderDeps): Lender;
/** Failures from the owner-derived `Lender.supply` operation. @category errors */
export type LenderSupplyError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Lender.withdraw` operation. @category errors */
export type LenderWithdrawError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Lender.borrow` operation. @category errors */
export type LenderBorrowError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Lender.repay` operation. @category errors */
export type LenderRepayError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Lender.setUseAsCollateral` operation. @category errors */
export type LenderSetUseAsCollateralError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Lender.supplyNative` operation. @category errors */
export type LenderSupplyNativeError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Lender.withdrawNative` operation. @category errors */
export type LenderWithdrawNativeError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Lender.borrowNative` operation. @category errors */
export type LenderBorrowNativeError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `Lender.repayNative` operation. @category errors */
export type LenderRepayNativeError = SomniaMarketsSocketFailure;
