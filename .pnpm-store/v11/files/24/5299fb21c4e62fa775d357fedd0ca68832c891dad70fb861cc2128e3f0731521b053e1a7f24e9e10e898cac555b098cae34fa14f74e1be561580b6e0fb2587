import type { SomniaMarketsSocketFailure } from "./config.js";
import { type Address, type Hex, type PublicClient } from "viem";
import * as IndexerRead from "./indexerRead.js";
import type { WriterRuntime } from "./writerRuntime.js";
import type { ClientConfig } from "./config.js";
import type { MachineryAdminConfig } from "./machineryWriter.js";
import type { TxResult } from "./trade.js";
/** Signer configuration for the market-creator administration capability. */
export type { MachineryAdminConfig as MarketCreatorAdminConfig };
/**
 *  Default CLOB order-book parameters a MarketCreator stamps onto each market it
 *  creates (mirror of the on-chain `OrderBookParameters` struct). All raw.
 *
 * @category administration
 */
export interface OrderBookParams {
    /** Minimum price increment, in raw quote-token (collateral) units. */
    tickSize: bigint;
    /** Minimum order quantity, in raw base-token (outcome-share) units. */
    minQuantity: bigint;
    /** Minimum quantity increment, in raw base-token (outcome-share) units. */
    lotSize: bigint;
}
/**
 * Params for {@link MarketCreatorAdmin.createMarketCreator}.
 *
 * @category administration
 */
export interface CreateMarketCreatorParams {
    /** Owner of the minted creator (can register series / trigger rolls). */
    owner: Address;
    /**
     *  Factory to mint from. Defaults to `config.addresses.marketCreatorFactory`
     *  (v1). Pass `config.addresses.marketCreatorFactoryV2` explicitly to mint an
     *  interval/bucket-mode `MarketCreatorV2` instead — the rest of this admin's
     *  surface (registerSeries / triggerRoll / armFirstRoll / …) targets either
     *  version unchanged, since v2's instance ABI is a superset of v1's here.
     */
    factory?: Address;
    /**
     *  Oracle adapter the creator's markets resolve against. Defaults to the
     *  protocol's OracleHub (`config.addresses.oracleHub`) — Oracle v2's ONE
     *  approved adapter; there is nothing to mint or arm per operator.
     */
    adapter?: Address;
    /** Origin operator id the creator's markets are attributed to. */
    operatorId: number;
    /**
     *  Origin venue id (within the operator). Must be a BINARY_V1 venue whose
     *  create path does NOT require a venue signature — the automated roll loop
     *  cannot produce per-create signatures.
     */
    venueId: Hex;
    /** Default order-book config stamped onto every market the creator deploys. */
    defaultBookParams: OrderBookParams;
    /**
     *  Core BinaryMarketsModule the creator binds to. Defaults to
     *  `config.addresses.binaryModule`.
     */
    core?: Address;
    /** Gas ceiling for this tx; overrides the config default. */
    gas?: bigint;
}
/**
 *  Result of {@link MarketCreatorAdmin.createMarketCreator} — the two addresses
 *  the factory minted, decoded from the receipt's `MarketCreatorCreated` event.
 *
 * @category administration
 */
export interface CreateMarketCreatorResult extends TxResult {
    /** The minted MarketCreator address (decoded from `MarketCreatorCreated`). */
    creator: Address;
    /** The minted MarketCreatorPolicy address (decoded from `MarketCreatorCreated`). */
    policy: Address;
}
/**
 * Params for {@link MarketCreatorAdmin.fundMarketCreator}.
 *
 * @category administration
 */
export interface FundMarketCreatorParams {
    /** The MarketCreator to fund. */
    creator: Address;
    /** Native amount (wei) to send to the creator's `receive()`. */
    amountWei: bigint;
    /** Gas ceiling for this tx; overrides the config default. */
    gas?: bigint;
}
/**
 *  Params for {@link MarketCreatorAdmin.registerSeries} /
 *  {@link MarketCreatorAdmin.updateSeries}.
 *
 * @category administration
 */
export interface RegisterSeriesParams {
    /** The MarketCreator to register the series under. Caller must be its owner. */
    creator: Address;
    /**
     *  Series key within the creator; re-registering the same id overwrites the
     *  config and resets the series' oracle reference.
     */
    seriesId: number;
    /** Per-series collateral ERC-20. */
    collateral: Address;
    /**
     *  Display ticker (e.g. "BTC" — NOT a pair). Doubles as the exchange base
     *  symbol for the USDC-quoted candle sources built per roll, so it must match
     *  the spot listing on the source exchanges (Binance/OKX/…).
     */
    asset: string;
    /** Decimal precision of the oracle's numeric price answer. */
    numericDecimals: number;
    /** Roll interval in seconds; the module rejects < 60 (`InvalidSeriesConfig`). */
    intervalSec: number;
    /** Post-expiry settlement window in seconds. */
    settlementWindow: number;
    /** Gas ceiling for this tx; overrides the config default. */
    gas?: bigint;
}
/**
 * Params for {@link MarketCreatorAdmin.triggerRoll}.
 *
 * @category administration
 */
export interface TriggerRollParams {
    /** The MarketCreator owning the series. Caller must be its owner. */
    creator: Address;
    /** The series to roll. */
    seriesId: number;
    /** Gas ceiling for this tx; overrides the config default. */
    gas?: bigint;
}
/**
 * Params for {@link MarketCreatorAdmin.recoverSeries}.
 *
 * @category administration
 */
export interface RecoverSeriesParams {
    /** The MarketCreatorV2 owning the series. Permissionless — any caller. */
    creator: Address;
    /** The provably stalled series to recover. */
    seriesId: number;
    /** Gas ceiling for this tx; overrides the config default. */
    gas?: bigint;
}
/**
 * Params for {@link MarketCreatorAdmin.setReactivityGasParams}.
 *
 * @category administration
 */
export interface SetReactivityGasParamsParams {
    /** The MarketCreator to update. Caller must be its owner. */
    creator: Address;
    /** Priority fee per gas (wei) the reactivity callback bids. */
    priorityFeePerGas: bigint;
    /** Max fee per gas (wei) the reactivity callback bids. */
    maxFeePerGas: bigint;
    /** Gas limit reserved per reactivity subscription (gas units). */
    gasLimit: bigint;
    /** Gas ceiling for this tx; overrides the config default. */
    gas?: bigint;
}
/**
 * Params for {@link MarketCreatorAdmin.armFirstRoll}.
 *
 * @category administration
 */
export interface ArmFirstRollParams {
    /** The MarketCreator owning the series. Caller must be its owner. */
    creator: Address;
    /**
     *  The series whose first roll is armed; refuses re-arming or an
     *  already-rolled series.
     */
    seriesId: number;
    /**
     *  Future, interval-aligned Unix-seconds boundary to arm the series' first roll
     *  at (typically the outgoing creator's current-market expiry for a seamless
     *  migration).
     */
    firesAtSec: bigint;
    /** Gas ceiling for this tx; overrides the config default. */
    gas?: bigint;
}
/**
 * Params for {@link MarketCreatorAdmin.reclaimOracleCredit}.
 *
 * @category administration
 */
export interface ReclaimOracleCreditParams {
    /** The MarketCreator whose oracle credit is swept (permissionless). */
    creator: Address;
    /** Gas ceiling for this tx; overrides the config default. */
    gas?: bigint;
}
/**
 * Params for {@link MarketCreatorAdmin.adoptFrom}.
 *
 * @category administration
 */
export interface AdoptFromParams {
    /**
     *  The INCOMING (v2) creator that adopts. Caller must be its owner; it must
     *  share `old`'s operator/venue/owner and have its reactivity gas params set.
     */
    successor: Address;
    /** The quiesced predecessor whose series + pending qid routing are inherited. */
    old: Address;
    /** Gas ceiling for this tx; overrides the config default. */
    gas?: bigint;
}
/**
 * Params for {@link MarketCreatorAdmin.handoffTo}.
 *
 * @category administration
 */
export interface HandoffToParams {
    /** The OUTGOING creator to retire. Caller must be its owner. */
    creator: Address;
    /** The incoming creator (same owner + venue) the float is swept to. */
    successor: Address;
    /** Gas ceiling for this tx; overrides the config default. */
    gas?: bigint;
}
/**
 * Params for {@link MarketCreatorAdmin.swapCreator}.
 *
 * @category administration
 */
export interface SwapCreatorParams {
    /** The venue's MarketCreatorPolicy. Caller must be its owner. */
    policy: Address;
    /** Outgoing creator to revoke. */
    from: Address;
    /** Incoming creator to authorize. */
    to: Address;
    /** Gas ceiling for this tx; overrides the config default. */
    gas?: bigint;
}
/**
 * One MarketCreator's live on-chain binding (the point read a wizard confirms).
 *
 * @category administration
 */
export interface MarketCreatorOnchain {
    /** Core BinaryMarketsModule the creator schedules markets through (immutable). */
    core: Address;
    /** Oracle adapter every series question resolves against (immutable). */
    adapter: Address;
    /** Origin operator id the creator's markets are attributed to (immutable). */
    operatorId: number;
    /** Origin venue id (within the operator) the markets are attributed to (immutable). */
    venueId: Hex;
    /** Current owner (can register series / trigger rolls). */
    owner: Address;
    /** Default order-book config applied to every market the creator deploys. */
    defaultBookParams: OrderBookParams;
}
/**
 * One Series' live on-chain config (mirror of the `Series` struct).
 *
 * @category administration
 */
export interface SeriesOnchain {
    /** Per-series collateral ERC-20. */
    collateral: Address;
    /**
     *  Display ticker (e.g. "BTC" — NOT a pair). Doubles as the exchange base
     *  symbol for the USDC-quoted candle sources built per roll, so it must match
     *  the spot listing on the source exchanges (Binance/OKX/…).
     */
    asset: string;
    /** Decimal precision of the oracle's numeric price answer. */
    numericDecimals: number;
    /** Roll interval in seconds; `0` means the series was never registered. */
    intervalSec: number;
    /** Post-expiry settlement window in seconds. */
    settlementWindow: number;
}
/**
 *  The MarketCreator write + status surface — stamp out creators, register
 *  rolling series, fund/roll/tune them (see the module notes above). Built via
 *  `client.createMarketCreatorAdmin(config)` with a signer
 *  ({@link MarketCreatorAdminConfig}); every write sends one tx and resolves
 *  with its receipt after inclusion.
 *
 *  Every write throws `ContractRevertError` when the chain rejects it — at
 *  simulation, at send, or as a mined receipt with `status: "reverted"` (the
 *  reason is recovered by replaying the call at that block while the node still
 *  has the state) — and `RpcError` when the send or the receipt read does not
 *  complete. A reverted write never resolves as if it had been confirmed.
 *
 * @category administration
 */
export interface MarketCreatorAdmin {
    /**
     *  Stamp out a new MarketCreator (+ its policy) from the factory, bound to
     *  `(operatorId, venueId, core, adapter)` + a default book config. Resolves
     *  with the minted `creator` + `policy` (decoded from `MarketCreatorCreated`).
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
    createMarketCreator(p: CreateMarketCreatorParams): Promise<CreateMarketCreatorResult>;
    /**
     *  Send native currency to a creator's `receive()` — it pays for reactivity
     *  rolls, so it must hold a balance on testnet/mainnet.
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
    fundMarketCreator(p: FundMarketCreatorParams): Promise<TxResult>;
    /**
     *  Register (or overwrite) a rolling-market series under a creator. Owner-only.
     *  `intervalSec` must be >= 60 and `asset` non-empty (the module reverts
     *  otherwise).
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
    registerSeries(p: RegisterSeriesParams): Promise<TxResult>;
    /**
     *  Overwrite an existing series — alias of {@link registerSeries} (the module
     *  upserts by `seriesId`). Provided for wizard clarity.
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
    updateSeries(p: RegisterSeriesParams): Promise<TxResult>;
    /**
     *  V1 ONLY: roll a series to its next market (owner-only). MarketCreatorV2
     *  dropped `triggerRoll` — its one start path is {@link armFirstRoll} at a
     *  wall-clock boundary (restart = re-register + armFirstRoll), and stalls are
     *  handled by the permissionless {@link recoverSeries}. Calling this against
     *  a v2 creator reverts (selector absent). NOTE: calls the Somnia reactivity
     *  precompile — only succeeds on testnet/mainnet, not local anvil.
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
    triggerRoll(p: TriggerRollParams): Promise<TxResult>;
    /**
     *  V2: PERMISSIONLESS last-resort recovery of a provably stalled series —
     *  covers dead subscriptions (out-of-funds auto-cancel / subscribe strand)
     *  and a refunded-but-comatose creator. Rate-limited on-chain (one attempt
     *  per backstop period per series); reverts `SeriesNotStalled` without
     *  evidence. The ops story after an out-of-funds incident: refuel the
     *  creator, call this once per stalled series. Touches the reactivity
     *  precompile → testnet/mainnet only.
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
    recoverSeries(p: RecoverSeriesParams): Promise<TxResult>;
    /**
     *  A1: arm a series' FIRST roll at a future boundary WITHOUT minting now
     *  (owner-only) — the seamless-migration tool: start a fresh MC's series exactly
     *  at the outgoing MC's expiry. NOTE: touches the reactivity precompile —
     *  testnet/mainnet only.
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
    armFirstRoll(p: ArmFirstRollParams): Promise<TxResult>;
    /**
     *  A1: pull the creator's own accrued oracle surplus (payer credit) out of the
     *  hub into its native float. Runs automatically each roll cycle; this is the
     *  manual sweep of any leftovers. Permissionless.
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
    reclaimOracleCredit(p: ReclaimOracleCreditParams): Promise<TxResult>;
    /**
     *  In-place creator migration — PULL side (v2). `adoptFrom` inherits a quiesced
     *  predecessor's whole series set + each series' pending oracle qid onto the
     *  successor, so the next roll fires on the successor off the outgoing market's
     *  own answer (strike chain intact, no bootstrap). Reverts unless same
     *  operator/venue/owner, the predecessor is quiesced, and the successor's
     *  reactivity gas params are set. Touches the reactivity precompile →
     *  testnet/mainnet only. See docs/runbooks/migrating-market-creator.md.
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
    adoptFrom(p: AdoptFromParams): Promise<TxResult>;
    /**
     *  In-place creator migration — PUSH side (v2). Retire the outgoing creator:
     *  tear down its subscriptions, sweep its native float to `successor`, and set
     *  `retired` (bricks rolling). Owner-only; the successor must share owner +
     *  venue. Touches the reactivity precompile → testnet/mainnet only.
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
    handoffTo(p: HandoffToParams): Promise<TxResult>;
    /**
     *  Atomically flip a venue's `MarketCreatorPolicy` allowlist from `from` to `to`
     *  (policy-owner only) — the cutover switch paired with adoptFrom/handoffTo, so
     *  there is never a window where both or neither creator is authorized.
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
    swapCreator(p: SwapCreatorParams): Promise<TxResult>;
    /** Update the creator's reactivity gas params (owner-only).
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
    setReactivityGasParams(p: SetReactivityGasParamsParams): Promise<TxResult>;
    /**
     *  One creator's live binding (core/adapter/operatorId/venueId/owner + default
     *  book params). On-chain point read.
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
    getMarketCreatorOnchain(creator: Address): Promise<MarketCreatorOnchain>;
    /**
     *  One series' live config under a creator. On-chain point read; the returned
     *  `intervalSec === 0` means the series was never registered.
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
    getSeriesOnchain(creator: Address, seriesId: number): Promise<SeriesOnchain>;
}
/**
 * Dependencies supplied by the owning client to its market-creator capability.
 *
 * @internal
 */
export interface MarketCreatorAdminDeps {
    getConfig: () => ClientConfig;
    getClient: () => PublicClient;
    /** The current owner lifecycle, captured before each write starts. */
    getReceiptSignal?: () => AbortSignal | undefined;
    writerRuntime?: WriterRuntime;
}
export declare function createMarketCreatorAdminWithDeps(config: MachineryAdminConfig, deps: MarketCreatorAdminDeps): MarketCreatorAdmin;
/**
 *  A Series as the indexer sees it (mirror of the `Series` entity) — one rolling
 *  up/down market spec registered under a creator.
 *
 * @category administration
 */
export type IndexedSeries = {
    /** Entity id: `${creatorLower}_${seriesId}`. */
    id: string;
    /** The MarketCreator this series belongs to (lowercased). */
    creatorAddress: string;
    /** Per-creator series id (uint32). */
    seriesId: number;
    /** Per-series collateral ERC-20 (lowercased). */
    collateral: string;
    /** Underlying asset label (e.g. "BTC/USDT"). */
    asset: string;
    /** Roll interval in seconds (raw bigint as string). */
    intervalSec: string;
    /**
     *  Timestamp (unix seconds) the series was registered. `null` when the row was
     *  first written by an event that carries no creation block (the handlers pass
     *  `prior?.createdAtTimestamp` through) — the indexer schema declares it
     *  nullable, so this mirrors the wire.
     */
    createdAtTimestamp: string | null;
    /** Timestamp (unix seconds) of the last update (a re-register overwrites); null until first update. */
    updatedAtTimestamp: string | null;
};
/**
 *  A MarketCreator as the indexer sees it (mirror of the `MarketCreator` entity)
 *  — one per (operator, venue) machinery instance.
 *
 * @category administration
 */
export type IndexedMarketCreator = {
    /** MarketCreator address (== entity id, lowercased). */
    id: string;
    /** Owner address (lowercased). */
    owner: string;
    /** The creator's MarketCreatorPolicy address (lowercased). */
    policy: string;
    /** The core BinaryMarketsModule the creator binds to (lowercased). */
    core: string;
    /** The oracle adapter the creator's markets resolve against (lowercased). */
    adapter: string;
    /** The operator the creator is bound to. */
    operatorId: number;
    /** Opaque bytes32 venue id the creator is bound to. */
    venueId: string;
    /**
     *  The MarketCreatorFactory that minted this creator (lowercased). `null` for a
     *  creator observed before/without its factory event.
     */
    factory: string | null;
    /** Block the creator was deployed in (decimal string); null when not yet observed. */
    createdAtBlock: number | null;
    /** Timestamp (unix seconds) the creator was deployed; null when not yet observed. */
    createdAtTimestamp: string | null;
    /** The series registered under this creator (nested relationship). */
    series: IndexedSeries[];
};
/**
 * An OracleAdapter as the indexer sees it (mirror of the `OracleAdapter` entity).
 *
 * @category administration
 */
export type IndexedOracleAdapter = {
    /** Adapter address (== entity id, lowercased). */
    id: string;
    /** Owner address (lowercased). */
    owner: string;
    /**
     *  The OracleAdapterFactory that minted it (lowercased); null for the
     *  protocol's shared adapter (deployed outside the factory).
     */
    factory: string | null;
    /** Whether the module has approved the adapter (the inert→live gate). */
    approved: boolean;
    /** Timestamp the adapter was approved (null if never approved). */
    approvedAtTimestamp: string | null;
    /**
     *  Timestamp (unix seconds) the adapter was deployed/first indexed. `null` when
     *  the approval event was indexed BEFORE the creation event — the handler carries
     *  `prior?.createdAtTimestamp` forward, so an approve-first ordering leaves it
     *  unset (see indexer/src/handlers/machinery.ts).
     */
    createdAtTimestamp: string | null;
};
/**
 *  A MarketCreatorPolicy as the indexer sees it (mirror of the
 *  `MarketCreatorPolicy` entity).
 *
 * @category administration
 */
export type IndexedMarketCreatorPolicy = {
    /** Policy address (== entity id, lowercased). */
    id: string;
    /** Owner address (lowercased). */
    owner: string;
    /** The MarketCreator this policy gates (lowercased). */
    creator: string;
    /** Timestamp (unix seconds) the policy was deployed. */
    createdAtTimestamp: string;
};
/**
 * Server-side filter for the MarketCreator directory. Every field optional.
 *
 * @category administration
 */
export type MarketCreatorFilter = {
    /** Restrict to creators owned by this address (case-insensitive). */
    owner?: string;
    /** Restrict to one operator id. */
    operatorId?: number;
    /** Restrict to one bytes32 venue id (case-insensitive). */
    venueId?: string;
};
/**
 *  List MarketCreators, newest-first, paginated. Pass `owner` to scope to one
 *  owner's machinery (the indexed "my creators", no log scan), `operatorId` /
 *  `venueId` to scope to one operator/venue. Each row carries its nested
 *  `series`. Indexer read.
 */
export declare function listMarketCreators(opts: (MarketCreatorFilter & {
    limit?: number;
    offset?: number;
}) | undefined, indexerUrl: IndexerRead.Source): Promise<IndexedMarketCreator[]>;
/**
 *  Fetch one MarketCreator by its address (null if unknown), with its nested
 *  `series`. Indexer read.
 */
export declare function getMarketCreator(creator: string, indexerUrl: IndexerRead.Source): Promise<IndexedMarketCreator | null>;
/**
 *  List oracle adapters, newest-first, paginated. Pass `owner` to scope to one
 *  owner's adapters, `approved` to filter by the module-approval gate. Indexer read.
 */
export declare function listOracleAdapters(opts: {
    owner?: string;
    approved?: boolean;
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<IndexedOracleAdapter[]>;
/** Fetch one oracle adapter by its address (null if unknown). Indexer read. */
export declare function getOracleAdapter(adapter: string, indexerUrl: IndexerRead.Source): Promise<IndexedOracleAdapter | null>;
/** List series, creation-order, optionally scoped to one creator. Indexer read. */
/**
 *  One series by its composite key `(creator, seriesId)` — seriesId is
 *  per-creator, so the pair (== entity id `${creatorLower}_${seriesId}`) names
 *  exactly one series. The row is the CURRENT spec: `registerSeries` overwrites
 *  in place (updatedAtTimestamp bumps). Null when never registered.
 */
export declare function getSeries(creator: string, seriesId: number, indexerUrl: IndexerRead.Source): Promise<IndexedSeries | null>;
export declare function listSeries(opts: {
    creator?: string;
    limit?: number;
    offset?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<IndexedSeries[]>;
/**
 *  The most recent market minted under one rolling series - one row per series
 *  that has rolled at least once, whichever creator owns it.
 *
 *  **When to use**
 *
 *  When the question is "when did this series LAST roll", asked for every series
 *  at once - a stall monitor, a scheduler dashboard. A series' own row
 *  ({@link IndexedSeries}) says how often it should roll and nothing about
 *  whether it did; a market row says when it was created and not which series
 *  it belongs to. This is that join, taken once and server-side: Hasura's
 *  `distinct_on: series_id` over markets ordered newest-first within each series.
 *
 *  A series that has never rolled has NO row here. Absence means "no market
 *  yet", not "stalled", and nothing indexed says when the first roll is due:
 *  `armFirstRoll` accepts any future interval-aligned boundary and emits no
 *  event, and a re-register keeps the original `createdAtTimestamp`, so neither
 *  {@link IndexedSeries.createdAtTimestamp} nor `updatedAtTimestamp` is a
 *  deadline. A caller that cannot judge a series should say so rather than
 *  anchor on either.
 *
 * @category administration
 */
export type SeriesLatestMarket = {
    /** The series' entity id, `${creatorLower}_${seriesId}` - {@link IndexedSeries.id}. */
    series: string;
    /** Id of the most recently created market under the series. */
    market: string;
    /** When that market was created (unix seconds, decimal string). */
    createdAtTimestamp: string;
};
/**
 *  Paging for {@link SomniaMarketsClient.listSeriesLatestMarkets}: a page of
 *  SERIES (the distinct rows), not of markets.
 *
 * @category administration
 */
export type ListSeriesLatestMarketsOptions = {
    /** Rows per page; default 100. */
    limit?: number;
    /** Rows to skip; default 0. */
    offset?: number;
};
/**
 *  List the most recent market of every series that has rolled at least once -
 *  see {@link SeriesLatestMarket}. Indexer read, one request per page.
 *
 *  Paged with `{ limit, offset }` over the DISTINCT rows, so a page is a page
 *  of series, not of markets. Series are few - tens, not thousands - and the
 *  default page holds every series in either environment today; paginate
 *  anyway, the way every other list read here is paginated.
 *
 *  Only markets the indexer attributed to a series appear: a binary market
 *  minted outside an indexed MarketCreator carries no `series_id`, and is not
 *  what this read is for.
 */
export declare function listSeriesLatestMarkets(opts: ListSeriesLatestMarketsOptions | undefined, indexerUrl: IndexerRead.Source): Promise<SeriesLatestMarket[]>;
/** Failures from the owner-derived `MarketCreatorAdmin.createMarketCreator` operation. @category errors */
export type MarketCreatorAdminCreateMarketCreatorError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `MarketCreatorAdmin.fundMarketCreator` operation. @category errors */
export type MarketCreatorAdminFundMarketCreatorError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `MarketCreatorAdmin.registerSeries` operation. @category errors */
export type MarketCreatorAdminRegisterSeriesError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `MarketCreatorAdmin.updateSeries` operation. @category errors */
export type MarketCreatorAdminUpdateSeriesError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `MarketCreatorAdmin.triggerRoll` operation. @category errors */
export type MarketCreatorAdminTriggerRollError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `MarketCreatorAdmin.recoverSeries` operation. @category errors */
export type MarketCreatorAdminRecoverSeriesError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `MarketCreatorAdmin.armFirstRoll` operation. @category errors */
export type MarketCreatorAdminArmFirstRollError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `MarketCreatorAdmin.reclaimOracleCredit` operation. @category errors */
export type MarketCreatorAdminReclaimOracleCreditError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `MarketCreatorAdmin.adoptFrom` operation. @category errors */
export type MarketCreatorAdminAdoptFromError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `MarketCreatorAdmin.handoffTo` operation. @category errors */
export type MarketCreatorAdminHandoffToError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `MarketCreatorAdmin.swapCreator` operation. @category errors */
export type MarketCreatorAdminSwapCreatorError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `MarketCreatorAdmin.setReactivityGasParams` operation. @category errors */
export type MarketCreatorAdminSetReactivityGasParamsError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `MarketCreatorAdmin.getMarketCreatorOnchain` operation. @category errors */
export type MarketCreatorAdminGetMarketCreatorOnchainError = SomniaMarketsSocketFailure;
/** Failures from the owner-derived `MarketCreatorAdmin.getSeriesOnchain` operation. @category errors */
export type MarketCreatorAdminGetSeriesOnchainError = SomniaMarketsSocketFailure;
