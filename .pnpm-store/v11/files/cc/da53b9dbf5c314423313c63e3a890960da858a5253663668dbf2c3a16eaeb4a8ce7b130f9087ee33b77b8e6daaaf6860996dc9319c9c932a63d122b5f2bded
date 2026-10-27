import type { SomniaMarketsSocketFailure } from "./config.js";
import { type Address, type Hex, type PublicClient } from "viem";
import type { WriterRuntime } from "./writerRuntime.js";
import type { ClientConfig } from "./config.js";
import * as IndexerRead from "./indexerRead.js";
import type { MachineryAdminConfig } from "./machineryWriter.js";
import type { TxResult } from "./trade.js";
export type { MachineryAdminConfig as OracleHubAdminConfig };
/**
 *  `QuestionSourceType` enum values (OracleTypes.sol). Only all-JSON
 *  definitions participate in the hub's content-addressed dedup.
 *
 * @category oracles
 */
export declare const QUESTION_SOURCE_TYPE: {
    /** Answer scraped from a website URL. */
    readonly Website: 0;
    /** Answer fetched from a JSON endpoint — the only source type eligible for dedup. */
    readonly JSON: 1;
    /** Answer read from an on-chain contract. */
    readonly Contract: 2;
};
/**
 * `AnswerType` enum values (OracleTypes.sol).
 *
 * @category oracles
 */
export declare const ANSWER_TYPE: {
    /** Resolves to a number, bucketed by `numericIntervals`. */
    readonly Numeric: 0;
    /** Resolves to one of the `discreteOutcomes` strings. */
    readonly Discrete: 1;
};
/**
 *  One answer source (website URL / JSON URL / on-chain contract) with its
 *  encoded params.
 *
 * @category oracles
 */
export interface QuestionSourceInput {
    /** {@link QUESTION_SOURCE_TYPE} value (uint8 on the wire). */
    sourceType: number;
    /** Source-type-specific encoded params. */
    params: Hex;
}
/**
 * Inclusive numeric interval (`low <= value <= high` matches the bucket).
 *
 * @category oracles
 */
export interface QuestionIntervalInput {
    /** Lower bound (inclusive), scaled by `numericDecimals`. */
    low: bigint;
    /** Upper bound (inclusive), scaled by `numericDecimals`. */
    high: bigint;
}
/**
 * The set of valid answers a question may resolve to.
 *
 * @category oracles
 */
export interface ValidAnswersInput {
    /** {@link ANSWER_TYPE} value (uint8 on the wire). */
    answerType: number;
    /** Outcome labels for a Discrete question; empty for Numeric. */
    discreteOutcomes: string[];
    /** Value buckets for a Numeric question (one outcome slot each); empty for Discrete. */
    numericIntervals: QuestionIntervalInput[];
    /** Fixed-point decimals the numeric answer and interval bounds are scaled by. */
    numericDecimals: bigint;
}
/**
 *  Full question definition — the input to `scheduleQuestion` /
 *  `getSchedulingCost` / `questionKeyOf`. Mirrors the on-chain
 *  `QuestionDefinition` struct field-for-field.
 *
 * @category oracles
 */
export interface QuestionDefinitionInput {
    /**
     *  Free-form question text. EXCLUDED from the dedup key for template
     *  (all-JSON-source) definitions — the sources determine the answer.
     */
    questionText: string;
    /** Answer sources the oracle fetches; all-JSON definitions dedup content-addressed. */
    sources: QuestionSourceInput[];
    /** The answer space the question resolves within. */
    validAnswers: ValidAnswersInput;
    /** Unix-seconds the oracle answers at. */
    resolutionTime: bigint;
    /** Minimum count of sources that must agree for the oracle to resolve (else void). */
    minAgreement: bigint;
    /** Oracle subcommittee nodes assigned to answer the question. */
    subcommitteeSize: bigint;
    /** Subcommittee nodes that must concur on the answer. */
    subcommitteeThreshold: bigint;
}
/**
 *  The MARGINAL scheduling cost for `def` (§8c dedup pricing): 0 when the
 *  definition's canonical key is already scheduled below the bind cap (the
 *  call would dedup onto the existing question), the full oracle submission
 *  cost otherwise (new question or cap-split). Pure chain read.
 */
export declare function getSchedulingCost(def: QuestionDefinitionInput, hub: Address, client: PublicClient): Promise<bigint>;
/**
 *  Native LOCKED for an operator's outstanding (bound-but-unresolved) markets
 *  (§8e). Grows by `resolveReserve()` per market at onBind, released at
 *  resolution. NEVER withdrawable (`earmarked == outstandingOf × resolveReserve`).
 *  Pure chain read.
 */
export declare function earmarkedOf(operatorId: number, hub: Address, client: PublicClient): Promise<bigint>;
/**
 *  An operator's accrued WITHDRAWABLE surplus credit on the hub (§8e): the
 *  Σ `reserve − charged` released when resolved markets metered under their
 *  earmark. The only balance `withdraw` may draw from. Pure chain read.
 */
export declare function creditOf(operatorId: number, hub: Address, client: PublicClient): Promise<bigint>;
/**
 *  Count of an operator's bound-but-unresolved markets (§8e). Pure chain read.
 *  `earmarkedOf == outstandingOf × resolveReserve` at every quiescent point.
 */
export declare function outstandingOf(operatorId: number, hub: Address, client: PublicClient): Promise<bigint>;
/**
 *  Wei an operator's owner may withdraw right now (§8e) — equal to `creditOf`;
 *  the earmark backing live markets is never withdrawable. Pure chain read.
 */
export declare function withdrawableOf(operatorId: number, hub: Address, client: PublicClient): Promise<bigint>;
/**
 *  A1: the withdrawable surplus credited to a reserve-PAYER (`origin.creator` —
 *  an open-venue user, or the autonomous MarketCreator on its rolls) rather than
 *  the operator. That account draws it itself via `withdrawMyCredit`. Pure chain
 *  read.
 */
export declare function payerCreditOf(payer: Address, hub: Address, client: PublicClient): Promise<bigint>;
/**
 *  A1: the account recorded as the reserve-payer for a market at onBind (the
 *  surplus recipient); zero-address once the market has settled + been swept.
 *  Pure chain read.
 */
export declare function payerOf(marketId: Hex, hub: Address, client: PublicClient): Promise<Address>;
/**
 *  The per-market resolution reserve (§8e): the exact wei ATTACHED to each
 *  `onBind` (the market-creation value) and LOCKED per-market — one worst-case
 *  resolve (`perMarketResolveGas × maxFeePerGas`). Pure chain read.
 */
export declare function resolveReserve(hub: Address, client: PublicClient): Promise<bigint>;
/**
 *  THE §8e user-side create-value rule:
 *  `quoteCreateMarketValue(def) = getSchedulingCost(def) + resolveReserve()`.
 *
 *  This is the exact native value to attach to
 *  `BinaryMarketsModule.scheduleAndCreateMarket` (schedule + bind in one tx):
 *  the marginal scheduling cost PLUS the resolution reserve, which is ATTACHED to
 *  the create and LOCKED per-market at onBind (earmark-at-creation — there is NO
 *  standing prepaid pre-fund anymore). For `createMarket` against an
 *  ALREADY-scheduled question the scheduling cost is 0, so the value is just the
 *  reserve. Quote fresh per create — the scheduling cost is marginal (drops to 0
 *  once the question exists). Excess is refunded in-tx.
 */
export declare function quoteCreateMarketValue(def: QuestionDefinitionInput, hub: Address, client: PublicClient): Promise<bigint>;
/**
 * One question's live dedup state on the hub.
 *
 * @category oracles
 */
export interface HubQuestionState {
    /**
     *  Canonical dedup key for the definition (zero for non-template
     *  definitions, which bypass dedup).
     */
    questionKey: Hex;
    /** The ACTIVE question id the key resolves to (0n = never scheduled). */
    oracleQuestionId: bigint;
    /** Lifetime bind count for that question (drives the cap-split). */
    bindCount: number;
    /** Every marketId bound to the question (the fan-out list the drain walks). */
    markets: Hex[];
}
/**
 * Live on-chain status of the hub (the point read a panel confirms).
 *
 * @category oracles
 */
export interface HubStatus {
    /** Hub owner — the account gated into `withdraw` / gas + drain param writes. */
    owner: Address;
    /**
     *  Total native balance (wei) the hub holds (Σ earmarked + accrued credit +
     *  reactivity bond float).
     */
    balanceWei: bigint;
    /**
     *  Whether the module has the hub approved (`approvedAdapters(hub)`) — the
     *  wired/live gate.
     */
    approved: boolean;
    /** Reactivity subscription id; 0n until `enableReactivity` succeeds. */
    subscriptionId: bigint;
    /** Reactivity-callback tip (wei per gas). */
    priorityFeePerGas: bigint;
    /** Reactivity-callback fee ceiling (wei per gas); one factor of `resolveReserve`. */
    maxFeePerGas: bigint;
    /** Gas limit each reactivity callback runs with. */
    gasLimit: bigint;
    /** Per-market resolve-slice gas constant (sizes `resolveReserve`). */
    perMarketResolveGas: bigint;
    /** Explicitly-attributed callback overhead gas constant (metering). */
    callbackBaseGas: bigint;
    /** Belt-and-suspenders cap on markets resolved per callback. */
    maxResolvesPerCallback: bigint;
    /** Gas reserve that breaks the drain loop to the next block. */
    resolveGasReserve: bigint;
    /** Per-market resolution reserve attached+locked at onBind (`resolveReserve()`, wei). */
    resolveReserveWei: bigint;
    /** Markets still queued for resolution across all pending qids. */
    pendingResolves: bigint;
}
/**
 * Parameters for {@link OracleHubAdmin.scheduleQuestion}.
 *
 * @category oracles
 */
export interface ScheduleQuestionParams {
    /** The question to schedule (deduped content-addressed for template definitions). */
    def: QuestionDefinitionInput;
    /**
     *  Native value to attach. Defaults to the live `getSchedulingCost(def)`
     *  quote (the marginal price — 0 for a dedup reuse).
     */
    valueWei?: bigint;
    /** Gas-limit override for this tx (defaults to the admin config's `gas`). */
    gas?: bigint;
}
/**
 *  Result of {@link OracleHubAdmin.scheduleQuestion}.
 *
 *  **Details**
 *
 *  Scheduling is idempotent by question DEFINITION: an identical definition
 *  deduplicates onto the existing question instead of creating a second one.
 *
 *  **Gotchas**
 *
 *  Because of that deduplication, check `reused` before assuming this call is
 *  what created the id.
 *
 * @category oracles
 */
export interface ScheduleQuestionResult extends TxResult {
    /** Oracle-assigned (or deduplicated) question id. */
    oracleQuestionId: bigint;
    /**
     *  True when the definition deduplicated onto an EXISTING question
     *  (`QuestionReused` — the caller was charged nothing).
     */
    reused: boolean;
}
/**
 * Parameters for {@link OracleHubAdmin.withdraw}.
 *
 * @category oracles
 */
export interface WithdrawParams {
    /** Operator whose WITHDRAWABLE credit to draw down. OWNER-gated on-chain. */
    operatorId: number;
    /**
     *  Wei to withdraw from the operator's accrued surplus credit (must be ≤
     *  `withdrawableOf(operatorId)`, else the hub reverts `InsufficientCredit`).
     */
    amountWei: bigint;
    /** Recipient of the native transfer. */
    to: Address;
    /** Gas-limit override for this tx (defaults to the admin config's `gas`). */
    gas?: bigint;
}
/**
 * Parameters for {@link OracleHubAdmin.withdrawMyCredit}.
 *
 * @category oracles
 */
export interface WithdrawMyCreditParams {
    /**
     *  Wei to withdraw from the CALLER's own accrued A1 payer credit (must be ≤
     *  `payerCreditOf(caller)`, else the hub reverts). msg.sender-gated — the
     *  connected signer draws only its own credit.
     */
    amountWei: bigint;
    /** Recipient of the native transfer. */
    to: Address;
    /** Gas-limit override for this tx (defaults to the admin config's `gas`). */
    gas?: bigint;
}
/**
 * Parameters for {@link OracleHubAdmin.fundHub}.
 *
 * @category oracles
 */
export interface FundHubParams {
    /**
     *  Native amount (wei) sent to the hub's `receive()` — tops up the
     *  reactivity bond the precompile debits callbacks from. NOT credited to any
     *  operator (resolution funding is attached per-market at create/onBind).
     */
    amountWei: bigint;
    /** Gas-limit override for this tx (defaults to the admin config's `gas`). */
    gas?: bigint;
}
/**
 * Parameters for {@link OracleHubAdmin.setGasParams} (OWNER-only).
 *
 * @category oracles
 */
export interface SetHubGasParams {
    /** New reactivity-callback tip (wei per gas). */
    priorityFeePerGas: bigint;
    /**
     *  New reactivity-callback fee ceiling (wei per gas) — also reprices
     *  `resolveReserve()` immediately.
     */
    maxFeePerGas: bigint;
    /** New gas limit each reactivity callback runs with. */
    gasLimit: bigint;
    /** Gas-limit override for this tx (defaults to the admin config's `gas`). */
    gas?: bigint;
}
/**
 * Parameters for {@link OracleHubAdmin.setDrainParams} (OWNER-only).
 *
 * @category oracles
 */
export interface SetHubDrainParams {
    /**
     *  Gas budgeted per market resolve — sizes `resolveReserve()`
     *  (`perMarketResolveGas × maxFeePerGas`).
     */
    perMarketResolveGas: bigint;
    /**
     *  Callback overhead gas explicitly attributed across the markets resolved
     *  in it (the metering overhead term).
     */
    callbackBaseGas: bigint;
    /** Belt-and-suspenders cap on markets resolved per callback. */
    maxResolvesPerCallback: bigint;
    /** Remaining-gas floor at which the drain loop breaks to the next block. */
    resolveGasReserve: bigint;
    /** Gas-limit override for this tx (defaults to the admin config's `gas`). */
    gas?: bigint;
}
/**
 *  Parameters for {@link OracleHubAdmin.enableReactivity} /
 *  {@link OracleHubAdmin.migrateSubscription}.
 *
 * @category oracles
 */
export interface EnableHubReactivityParams {
    /** Gas-limit override for this tx (defaults to the admin config's `gas`). */
    gas?: bigint;
}
/**
 * Admin handle for the OracleHub — the protocol's ONE governance-approved oracle
 * adapter (Oracle v2 §8e, earmark-at-creation). Point reads (quotes, the
 * earmark/credit accounts, dedup state, live status) plus the signed writes
 * (schedule, credit-only withdrawals, funding, owner-gated gas/drain params,
 * reactivity wiring). Built via `client.createOracleHubAdmin(config)`; needs
 * `config.addresses.oracleHub` (and `binaryModule` for the approval reads).
 *
 *  Every write throws `ContractRevertError` when the chain rejects it — at
 *  simulation, at send, or as a mined receipt with `status: "reverted"` (the
 *  reason is recovered by replaying the call at that block while the node still
 *  has the state) — and `RpcError` when the send or the receipt read does not
 *  complete. A reverted write never resolves as if it had been confirmed.
 *
 * @category oracles
 */
export interface OracleHubAdmin {
    /** Marginal scheduling cost for `def` (0 = would dedup).
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
    getSchedulingCost(def: QuestionDefinitionInput): Promise<bigint>;
    /** Native LOCKED for an operator's outstanding markets (wei; never withdrawable).
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
    earmarkedOf(operatorId: number): Promise<bigint>;
    /** An operator's accrued WITHDRAWABLE surplus credit on the hub (wei).
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
    creditOf(operatorId: number): Promise<bigint>;
    /** Count of an operator's bound-but-unresolved markets.
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
    outstandingOf(operatorId: number): Promise<bigint>;
    /** Wei an operator's owner may withdraw right now (== `creditOf`).
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
    withdrawableOf(operatorId: number): Promise<bigint>;
    /**
     *  A1: withdrawable surplus credited to a reserve-PAYER (open-venue creator or
     *  the autonomous MarketCreator), drawn by that account itself.
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
    payerCreditOf(payer: Address): Promise<bigint>;
    /**
     *  A1: the reserve-payer recorded for a market at onBind (surplus recipient);
     *  zero-address once settled + swept.
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
    payerOf(marketId: Hex): Promise<Address>;
    /** The per-market resolution reserve attached+locked at onBind (wei).
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
    resolveReserve(): Promise<bigint>;
    /**
     *  THE §8e create-market value rule: `getSchedulingCost(def) + resolveReserve()`
     *  (the reserve is attached to the create; attach exactly this to
     *  `scheduleAndCreateMarket`; excess refunds).
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
    quoteCreateMarketValue(def: QuestionDefinitionInput): Promise<bigint>;
    /**
     *  One definition's full dedup state: canonical key, the active question id
     *  it resolves to (0n = none), bind count, and the bound-market fan-out list.
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
    getQuestionState(def: QuestionDefinitionInput): Promise<HubQuestionState>;
    /** The ACTIVE question id for a canonical key (0n = never scheduled).
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
    getQuestionIdByKey(questionKey: Hex): Promise<bigint>;
    /** Lifetime bind count for a question id.
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
    getBindCount(oracleQuestionId: bigint): Promise<number>;
    /** Every marketId bound to a question id (the fan-out list).
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
    getMarketsForQuestion(oracleQuestionId: bigint): Promise<Hex[]>;
    /**
     *  Whether the module has the hub approved (`approvedAdapters(hub)`) — the
     *  Oracle v2 equivalent of the old per-adapter `isAdapterApproved`. Needs
     *  `config.addresses.binaryModule`.
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
    isHubApproved(): Promise<boolean>;
    /**
     *  The hub's full live status (owner / balance / approval / subscription /
     *  gas + drain params / resolveReserve + pending drain).
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
    getHubStatus(): Promise<HubStatus>;
    /**
     *  Schedule a question through the hub (content-addressed: an identical
     *  template definition returns the EXISTING id and refunds the value).
     *  Resolves with the question id decoded from `QuestionScheduled` /
     *  `QuestionReused` and whether it deduplicated.
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
    scheduleQuestion(p: ScheduleQuestionParams): Promise<ScheduleQuestionResult>;
    /**
     *  Withdraw an operator's accrued WITHDRAWABLE surplus credit (credit-only;
     *  OWNER-gated on-chain: only the operator's owner, read from MarketsCore, may
     *  draw it, and only up to `withdrawableOf` — else `InsufficientCredit`). The
     *  earmark backing live markets is untouchable.
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
    withdraw(p: WithdrawParams): Promise<TxResult>;
    /**
     *  A1: withdraw the CALLER's own accrued payer credit (msg.sender-gated — the
     *  connected signer draws only its own surplus, up to `payerCreditOf(caller)`).
     *  This is how an open-venue creator claims their refund, and how the
     *  autonomous MarketCreator self-reclaims (via its own on-chain call).
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
    withdrawMyCredit(p: WithdrawMyCreditParams): Promise<TxResult>;
    /**
     *  Send native to the hub's `receive()` — funds the reactivity bond (hub
     *  float; NOT credited to any operator — resolution funding is per-market).
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
    fundHub(p: FundHubParams): Promise<TxResult>;
    /**
     *  Update the reactivity gas params (OWNER-only). `maxFeePerGas` also
     *  reprices `resolveReserve()` immediately.
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
    setGasParams(p: SetHubGasParams): Promise<TxResult>;
    /**
     *  Update the bounded-drain metering params (OWNER-only): `perMarketResolveGas`
     *  sizes `resolveReserve`, `callbackBaseGas` is the attributed overhead term,
     *  `maxResolvesPerCallback` + `resolveGasReserve` bound one callback's work.
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
    setDrainParams(p: SetHubDrainParams): Promise<TxResult>;
    /**
     *  Register the Somnia reactivity subscription (OWNER-only, one-shot). NOTE:
     *  calls the reactivity precompile at 0x0100, which does NOT exist on local
     *  anvil — testnet/mainnet only.
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
    enableReactivity(p?: EnableHubReactivityParams): Promise<TxResult>;
    /**
     *  Unsubscribe + re-subscribe with the current topic/gas params (OWNER-only;
     *  for upstream event-signature changes). Precompile — testnet/mainnet only.
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
    migrateSubscription(p?: EnableHubReactivityParams): Promise<TxResult>;
}
/**
 * Dependencies supplied by the owning client to its OracleHub capability.
 *
 * @internal
 */
export interface OracleHubAdminDeps {
    getConfig: () => ClientConfig;
    getClient: () => PublicClient;
    /** The current owner lifecycle, captured before each write starts. */
    getReceiptSignal?: () => AbortSignal | undefined;
    writerRuntime?: WriterRuntime;
}
export declare function createOracleHubAdminWithDeps(config: MachineryAdminConfig, deps: OracleHubAdminDeps): OracleHubAdmin;
/**
 *  A hub-scheduled oracle question (mirror of the indexer `OracleQuestion`
 *  entity; id = oracleQuestionId as a decimal string). Tracks the
 *  content-addressed dedup state: the canonical key, who paid the oracle
 *  submission, and how many markets bound to it.
 *
 * @category oracles
 */
export type OracleQuestionRecord = {
    /** oracleQuestionId (decimal string == entity id). */
    id: string;
    /**
     *  Canonical dedup key (bytes32 hex); zero/null for non-template definitions
     *  that bypassed dedup.
     */
    questionKey: string | null;
    /** Caller that paid the oracle submission cost (lowercased). */
    scheduler: string;
    /** Native wei forwarded to the oracle for this submission. */
    oracleCost: string;
    /** Lifetime bind count (from `MarketBound.bindCount`, monotonic). */
    bindCount: number;
    /**
     *  Times an identical definition deduplicated onto this question
     *  (`QuestionReused` count).
     */
    reuseCount: number;
    /** Block the question was scheduled in (decimal string). */
    createdAtBlock: string;
    /** Timestamp (unix seconds) the question was scheduled. */
    createdAtTimestamp: string;
};
/**
 *  An operator's hub account (mirror of the indexer `OperatorHubAccount` entity;
 *  id = operatorId decimal string) — the earmark-at-creation surface. Running
 *  totals derived from the hub events: `earmarked` (LOCKED, never withdrawable;
 *  == `outstanding × resolveReserve`), `credit` (WITHDRAWABLE surplus), and
 *  `outstanding` (bound-but-unresolved market count). Live/authoritative figures
 *  are the chain reads `earmarkedOf`/`creditOf`/`outstandingOf`.
 *
 * @category oracles
 */
export type OperatorHubAccountRecord = {
    /** operatorId (decimal string == entity id). */
    id: string;
    /** The operator the account belongs to (numeric form of `id`). */
    operatorId: number;
    /** Native LOCKED for outstanding markets (wei); Σ ReserveEarmarked − Σ released. */
    earmarked: string;
    /** Withdrawable surplus (wei): Σ SurplusCredited − Σ CreditWithdrawn. */
    credit: string;
    /** Bound-but-unresolved market count (binds − resolutions). */
    outstanding: string;
    /** Block the account first appeared in (decimal string). */
    createdAtBlock: string;
    /** Timestamp (unix seconds) the account first appeared. */
    createdAtTimestamp: string;
    /** Block of the last update to the running totals (decimal string). */
    updatedAtBlock: string;
    /** Timestamp (unix seconds) of the last update to the running totals. */
    updatedAtTimestamp: string;
};
/**
 *  One market's bind on a question (mirror of the indexer `OracleBind` entity,
 *  Oracle v2 §8e). Opens with `MarketBound` (operator attribution; the paired
 *  `ReserveEarmarked` locks the reserve), stamped at resolution with
 *  `MarketResolveCharged` (exact metered charge + subsidy; a surplus is credited
 *  via `SurplusCredited`). Per-market conservation: `charged + subsidy == cost`.
 *
 * @category oracles
 */
export type OracleBindRecord = {
    /** Bind id (`${oracleQuestionId}_${bindIndex}`). */
    id: string;
    /** Question the bind belongs to (decimal string). */
    oracleQuestionId: string;
    /** 1-based lifetime bind sequence on the question. */
    bindIndex: number;
    /** Operator whose earmark funds this market's resolve. */
    operatorId: number;
    /** gasleft()-wrapped measured gas of the resolve slice; null until resolved. */
    measuredGas: string | null;
    /** Pro-rata share of the callback overhead gas; null until resolved. */
    overheadShare: string | null;
    /** Exact wei the resolve cost worked out to; null until resolved. */
    cost: string | null;
    /**
     *  Wei actually charged against this market's earmark; null until resolved
     *  (== min(cost, reserve)).
     */
    charged: string | null;
    /**
     *  cost − charged: the reserve-capped shortfall the hub subsidised; null
     *  until resolved.
     */
    subsidy: string | null;
    /**
     *  Timestamp the resolve cost was charged (`MarketResolveCharged`); null
     *  until resolved — the resolved flag is simply `resolvedAt != null`.
     */
    resolvedAt: string | null;
    /** Block the bind landed in (decimal string). */
    boundAtBlock: string;
    /** Timestamp (unix seconds) of the bind. */
    boundAtTimestamp: string;
    /** Tx hash of the bind (the market-creation tx). */
    txHash: string;
};
/**
 *  One resolution callback's conservation record (mirror of the indexer
 *  `OracleCallback` entity ← the hub's `CallbackAccounted` event). NOT
 *  per-question (a callback drains across many qids). Invariants:
 *  `totalCost == (measuredGas + overheadGasAttributed) * gasPrice`; Σ of the
 *  callback's `OracleBindRecord.charged == totalCharged`; `totalCharged +
 *  subsidy == totalCost` (the subsidy is the hub's explicit reserve-capped
 *  shortfall).
 *
 * @category oracles
 */
export type OracleCallbackRecord = {
    /** Callback id (`${blockNumber}_${logIndex}`). */
    id: string;
    /** Number of markets resolved in this callback. */
    marketsResolved: string;
    /** `tx.gasprice` of the callback (wei). */
    gasPrice: string;
    /** Σ `gasleft()`-wrapped measured gas across the resolved markets. */
    measuredGas: string;
    /** The governance-calibrated `callbackBaseGas` term attributed on top. */
    overheadGasAttributed: string;
    /** Exact wei distributed: `(measuredGas + overhead) * gasPrice`. */
    totalCost: string;
    /** Σ wei actually charged against market earmarks. */
    totalCharged: string;
    /** `totalCost − totalCharged`: the hub's explicit reserve-capped subsidy. */
    subsidy: string;
    /** Markets still queued after this callback (0 = drain complete). */
    pendingRemaining: string;
    /** Block the callback landed in (decimal string). */
    blockNumber: string;
    /** Timestamp (unix seconds) of the callback. */
    timestamp: string;
    /** Tx hash of the callback. */
    txHash: string;
};
/** One hub-scheduled question by its oracleQuestionId, or null. Indexer read. */
export declare function getOracleQuestion(oracleQuestionId: string, indexerUrl: IndexerRead.Source): Promise<OracleQuestionRecord | null>;
/**
 *  Hub-scheduled questions, newest first — filter by `scheduler` and/or
 *  `questionKey`, paginate. Indexer read.
 */
export declare function listOracleQuestions(opts: {
    scheduler?: string;
    questionKey?: string;
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<OracleQuestionRecord[]>;
/**
 *  One operator's hub account (earmarked / credit / outstanding) by operatorId,
 *  or null. Indexer read.
 */
export declare function getOperatorHubAccount(operatorId: string | number, indexerUrl: IndexerRead.Source): Promise<OperatorHubAccountRecord | null>;
/**
 *  Operator hub-account records, most-recently-updated first, paginated.
 *  Indexer read.
 */
export declare function listOperatorHubAccounts(opts: {
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<OperatorHubAccountRecord[]>;
/**
 *  Bind records, newest first — filter by `operatorId` (an operator's bound
 *  markets + their exact resolve charges) and/or `oracleQuestionId`, optionally
 *  scope to `resolved` binds (`resolvedAt != null`), paginate. Oracle v2 §8e:
 *  no escrow — resolved rows carry the exact metered charge + subsidy. Indexer
 *  read.
 */
export declare function listOracleBinds(opts: {
    operatorId?: number;
    oracleQuestionId?: string;
    resolved?: boolean;
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<OracleBindRecord[]>;
/**
 *  Resolution-callback conservation records, newest first, paginated. The audit
 *  trail an off-chain verifier reconciles the hub's exact-metering invariants
 *  against (a callback drains across many questions, so there is no
 *  per-question filter). Indexer read.
 */
export declare function listOracleCallbacks(opts: {
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<OracleCallbackRecord[]>;
/** Failures from the owner-derived `OracleHubAdmin.getSchedulingCost` operation. @category errors */
export type OracleHubAdminGetSchedulingCostError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.earmarkedOf` operation. @category errors */
export type OracleHubAdminEarmarkedOfError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.creditOf` operation. @category errors */
export type OracleHubAdminCreditOfError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.outstandingOf` operation. @category errors */
export type OracleHubAdminOutstandingOfError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.withdrawableOf` operation. @category errors */
export type OracleHubAdminWithdrawableOfError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.payerCreditOf` operation. @category errors */
export type OracleHubAdminPayerCreditOfError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.payerOf` operation. @category errors */
export type OracleHubAdminPayerOfError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.resolveReserve` operation. @category errors */
export type OracleHubAdminResolveReserveError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.quoteCreateMarketValue` operation. @category errors */
export type OracleHubAdminQuoteCreateMarketValueError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.getQuestionState` operation. @category errors */
export type OracleHubAdminGetQuestionStateError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.getQuestionIdByKey` operation. @category errors */
export type OracleHubAdminGetQuestionIdByKeyError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.getBindCount` operation. @category errors */
export type OracleHubAdminGetBindCountError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.getMarketsForQuestion` operation. @category errors */
export type OracleHubAdminGetMarketsForQuestionError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.isHubApproved` operation. @category errors */
export type OracleHubAdminIsHubApprovedError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.getHubStatus` operation. @category errors */
export type OracleHubAdminGetHubStatusError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.scheduleQuestion` operation. @category errors */
export type OracleHubAdminScheduleQuestionError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.withdraw` operation. @category errors */
export type OracleHubAdminWithdrawError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.withdrawMyCredit` operation. @category errors */
export type OracleHubAdminWithdrawMyCreditError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.fundHub` operation. @category errors */
export type OracleHubAdminFundHubError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.setGasParams` operation. @category errors */
export type OracleHubAdminSetGasParamsError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.setDrainParams` operation. @category errors */
export type OracleHubAdminSetDrainParamsError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.enableReactivity` operation. @category errors */
export type OracleHubAdminEnableReactivityError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `OracleHubAdmin.migrateSubscription` operation. @category errors */
export type OracleHubAdminMigrateSubscriptionError = SomniaMarketsSocketFailure;
