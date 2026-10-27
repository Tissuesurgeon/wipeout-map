import type { SomniaMarketsSocketFailure } from "./config.js";
// Write side of MarketsCore — registering/updating operators, creating/updating
// venues. This admin surface adds only its MarketsCore pinning and the
// operator/venue id decoding; signing and sending ride the shared machinery
// writer (makeMachineryWriter — per-call nonce, eth_sendRawTransactionSync
// with the eth_sendRawTransaction fallback), like every other admin surface.

import {
  decodeEventLog,
  type Account,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { type ResultOf } from "@graphql-typed-document-node/core";
import * as IndexerRead from "./indexerRead.js";
import * as MachineryWriter from "./machineryWriter.js";
import { graphql } from "./gql/gql.js";
import type { Operator_Bool_Exp, Venue_Bool_Exp } from "./gql/graphql.js";
import { IndexerError, NotConfiguredError, RpcError } from "./errors.js";
import type { WriterRuntime } from "./writerRuntime.js";
import type { ClientConfig } from "./config.js";
import * as OperatorAbi from "./operatorAbi.js";
import type { TxResult } from "./trade.js";

/**
 *  Signer + target config for an {@link OperatorAdmin} (reached via
 *  `client.createOperatorAdmin(config)`). Pass exactly one signer source:
 *  `walletClient`, `account`, or `privateKey`.
 *
 * @category administration
 */
export interface OperatorAdminConfig {
  /** A pre-built signer (e.g. a browser/wagmi wallet over an injected provider). */
  walletClient?: WalletClient;
  /** A local signing account (e.g. from viem's privateKeyToAccount). */
  account?: Account | Address;
  /** Private key — the SDK derives the account. */
  privateKey?: Hex;
  /** Read client for receipts. Defaults to the client's WebSocket client. */
  publicClient?: PublicClient;
  /** MarketsCore address override. Defaults to `config.addresses.marketsCore`. */
  marketsCore?: Address;
  /**
   *  Default gas ceiling per tx.
   *  @default 10_000_000n
   */
  gas?: bigint;
}

/**
 *  A venue's mutable config (mirror of MarketsCore's `VenueConfig` input tuple) —
 *  passed whole to {@link OperatorAdmin.createVenue} and
 *  {@link OperatorAdmin.updateVenue}.
 *
 * @category administration
 */
export interface VenueConfigInput {
  /**
   *  Type-specific fee parameters, abi-encoded (see `encodeBinaryVenueFeeParams`
   *  for BINARY_V1). Opaque to the registry.
   */
  feeParams: Hex;
  /** Per-venue fee recipient; zero falls back to the operator's default. */
  feeRecipientOverride: Address;
  /**
   *  IVenuePolicy address; zero means no per-venue gate (the operator-wide
   *  policy still applies). Creation needs SOME create-side policy set —
   *  point this at the deployed OpenPolicy to make the venue open.
   */
  policy: Address;
  /** EIP-712 signer; non-zero requires a venue-signed authorization to create. */
  signer: Address;
  /**
   *  Whether market creation on this venue is live. Trading/settlement on
   *  existing markets is unaffected.
   */
  creationEnabled: boolean;
  /**
   *  Opaque metadata bytes attached to the venue; the registry attaches no
   *  semantics (indexed as-is). Defaults to `0x` (empty). Capped at 4 KiB.
   */
  context?: Hex;
}

/**
 * Params for {@link OperatorAdmin.registerOperator}.
 *
 * @category administration
 */
export interface RegisterOperatorParams {
  /** Default recipient of the operator's venue fees (a venue can override it). */
  feeRecipient: Address;
  /**
   *  Whether the operator starts live; flip later via
   *  {@link OperatorAdmin.setOperatorEnabled}.
   */
  enabled: boolean;
  /** IVenuePolicy address; zero for none (operator-wide gate is optional). */
  policy: Address;
  /** Opaque metadata bytes attached to the operator; empty (`0x`) by default. */
  context?: Hex;
  /** Gas ceiling for this tx; overrides the config default. */
  gas?: bigint;
}
/**
 *  Result of {@link OperatorAdmin.registerOperator} — carries the id the
 *  contract assigned, which every later operator call keys on.
 *
 * @category administration
 */
export interface RegisterOperatorResult extends TxResult {
  /** The auto-assigned operator id (decoded from `OperatorRegistered`). */
  operatorId: number;
}

/**
 *  Params for {@link OperatorAdmin.updateOperator}. Every mutable field is
 *  replaced — pass the full desired state, not a delta.
 *
 * @category administration
 */
export interface UpdateOperatorParams {
  /** The operator to update. Caller must be its owner. */
  operatorId: number;
  /** New default recipient of the operator's venue fees. */
  feeRecipient: Address;
  /** New enabled flag (the operator-wide kill switch). */
  enabled: boolean;
  /** New IVenuePolicy address; zero clears the operator-wide gate. */
  policy: Address;
  /** Opaque metadata bytes; replaces the prior value (empty `0x` clears it). */
  context?: Hex;
  /** Gas ceiling for this tx; overrides the config default. */
  gas?: bigint;
}

/**
 * Params for {@link OperatorAdmin.setOperatorEnabled}.
 *
 * @category administration
 */
export interface SetOperatorEnabledParams {
  /** The operator to flip. Caller must be its owner. */
  operatorId: number;
  /** New enabled flag (the operator-wide kill switch). */
  enabled: boolean;
  /** Gas ceiling for this tx; overrides the config default. */
  gas?: bigint;
}

/**
 * Params for {@link OperatorAdmin.transferOperatorOwnership}.
 *
 * @category administration
 */
export interface TransferOperatorOwnershipParams {
  /** The operator whose ownership is staged. Caller must be its owner. */
  operatorId: number;
  /**
   *  The staged new owner — must later call
   *  {@link OperatorAdmin.acceptOperatorOwnership} to complete the transfer.
   */
  newOwner: Address;
  /** Gas ceiling for this tx; overrides the config default. */
  gas?: bigint;
}

/**
 * Params for {@link OperatorAdmin.acceptOperatorOwnership}.
 *
 * @category administration
 */
export interface AcceptOperatorOwnershipParams {
  /** The operator with a pending transfer staged to the caller. */
  operatorId: number;
  /** Gas ceiling for this tx; overrides the config default. */
  gas?: bigint;
}

/**
 * Params for {@link OperatorAdmin.createVenue}.
 *
 * @category administration
 */
export interface CreateVenueParams {
  /** The operator the venue is created under. Caller must be its owner. */
  operatorId: number;
  /** Market-type id (e.g. `MarketTypeIds.BINARY_V1`); immutable once set. */
  marketType: Hex;
  /** The venue's initial config (fee params, recipient, policy, signer, …). */
  config: VenueConfigInput;
  /** Gas ceiling for this tx; overrides the config default. */
  gas?: bigint;
}
/**
 *  Result of {@link OperatorAdmin.createVenue} — carries the venue id the
 *  contract generated, which markets reference to inherit the venue's fees.
 *
 * @category administration
 */
export interface CreateVenueResult extends TxResult {
  /** The contract-generated venue id (decoded from `VenueCreated`). */
  venueId: Hex;
}

/**
 * Params for {@link OperatorAdmin.updateVenue}.
 *
 * @category administration
 */
export interface UpdateVenueParams {
  /** The operator owning the venue. Caller must be its owner. */
  operatorId: number;
  /** The venue to update (within the operator). */
  venueId: Hex;
  /**
   *  Replacement config — the full desired state, not a delta. `marketType`
   *  stays whatever it was at creation.
   */
  config: VenueConfigInput;
  /** Gas ceiling for this tx; overrides the config default. */
  gas?: bigint;
}

/**
 * Params for {@link OperatorAdmin.setVenueEnabled}.
 *
 * @category administration
 */
export interface SetVenueEnabledParams {
  /** The operator owning the venue. Caller must be its owner. */
  operatorId: number;
  /** The venue to flip (within the operator). */
  venueId: Hex;
  /** New creation flag; trading on existing markets is unaffected. */
  creationEnabled: boolean;
  /** Gas ceiling for this tx; overrides the config default. */
  gas?: bigint;
}

/**
 *  The MarketsCore control-plane write surface — register/update operators,
 *  create/update venues. Built via `client.createOperatorAdmin(config)` with a
 *  signer ({@link OperatorAdminConfig}); every method sends one tx and resolves
 *  with its receipt after inclusion. Directory reads live on the client
 *  (indexer-backed `listOperators` / `listVenues` / `getOperator` / `getVenue`).
 *
 *  Every write throws `ContractRevertError` when the chain rejects it — at
 *  simulation, at send, or as a mined receipt with `status: "reverted"` (the
 *  reason is recovered by replaying the call at that block while the node still
 *  has the state) — and `RpcError` when the send or the receipt read does not
 *  complete. A reverted write never resolves as if it had been confirmed.
 *
 * @category administration
 */
export interface OperatorAdmin {
  /**
   *  Permissionlessly claim a new operator identity. Resolves with the
   *  auto-assigned `operatorId` (decoded from `OperatorRegistered`).
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
  registerOperator(p: RegisterOperatorParams): Promise<RegisterOperatorResult>;
  /** Update all mutable operator fields at once. Operator-owner only.
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
  updateOperator(p: UpdateOperatorParams): Promise<TxResult>;
  /** Flip the operator's kill switch without touching other fields.
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
  setOperatorEnabled(p: SetOperatorEnabledParams): Promise<TxResult>;
  /**
   *  Stage a two-step operator-ownership transfer (or cancel a pending one by
   *  re-staging the current owner).
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
  transferOperatorOwnership(p: TransferOperatorOwnershipParams): Promise<TxResult>;
  /** Complete a pending operator-ownership transfer. Caller must be the staged owner.
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
  acceptOperatorOwnership(p: AcceptOperatorOwnershipParams): Promise<TxResult>;
  /**
   *  Create a venue under an operator. Resolves with the contract-generated
   *  `venueId` (decoded from `VenueCreated`).
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
  createVenue(p: CreateVenueParams): Promise<CreateVenueResult>;
  /** Replace a venue's mutable config (`marketType` cannot change here).
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
  updateVenue(p: UpdateVenueParams): Promise<TxResult>;
  /** Flip a venue's creation flag without touching other fields.
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
  setVenueEnabled(p: SetVenueEnabledParams): Promise<TxResult>;
}

/**
 * Dependencies supplied by the owning client to its operator capability.
 *
 * @internal
 */
export interface OperatorAdminDeps {
  getConfig: () => ClientConfig;
  getClient: () => PublicClient;
  /** The current owner lifecycle, captured before each write starts. */
  getReceiptSignal?: () => AbortSignal | undefined;
  writerRuntime?: WriterRuntime;
}

export function createOperatorAdminWithDeps(config: OperatorAdminConfig, deps: OperatorAdminDeps): OperatorAdmin {
  const marketsCore = config.marketsCore ?? deps.getConfig().addresses?.marketsCore;
  if (!marketsCore) {
    throw new NotConfiguredError("marketsCore or config.addresses.marketsCore", "createOperatorAdmin");
  }

  // Every send rides the shared machinery writer (signer resolution + the
  // realtime-with-fallback broadcast), pinned to the one MarketsCore target.
  const writer = MachineryWriter.makeMachineryWriter(config, deps, "createOperatorAdmin");

  interface WriteCall {
    functionName: string;
    args: readonly unknown[];
    gas?: bigint;
  }

  const execute = (w: WriteCall): Promise<TxResult> =>
    writer.execute({
      to: marketsCore,
      abi: OperatorAbi.marketsCoreWriteAbi,
      functionName: w.functionName,
      args: w.args,
      gas: w.gas,
    });

  function decodeOperatorId(receipt: TransactionReceipt): number {
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: OperatorAbi.marketsCoreEventsAbi,
          data: log.data,
          topics: log.topics,
        }) as {
          eventName: string;
          args: Record<string, unknown>;
        };
        if (decoded.eventName === "OperatorRegistered") return Number(decoded.args.operatorId);
      } catch {
        continue;
      }
    }
    throw new RpcError("registerOperator", "the receipt carried no OperatorRegistered event");
  }

  function decodeVenueId(receipt: TransactionReceipt): Hex {
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: OperatorAbi.marketsCoreEventsAbi,
          data: log.data,
          topics: log.topics,
        }) as {
          eventName: string;
          args: Record<string, unknown>;
        };
        if (decoded.eventName === "VenueCreated") return decoded.args.venueId as Hex;
      } catch {
        continue;
      }
    }
    throw new RpcError("createVenue", "the receipt carried no VenueCreated event");
  }

  const toTuple = (c: VenueConfigInput) =>
    [c.feeParams, c.feeRecipientOverride, c.policy, c.signer, c.creationEnabled, c.context ?? "0x"] as const;

  return {
    async registerOperator(p: RegisterOperatorParams): Promise<RegisterOperatorResult> {
      const result = await execute({
        functionName: "registerOperator",
        args: [p.feeRecipient, p.enabled, p.policy, p.context ?? "0x"],
        gas: p.gas,
      });
      return { ...result, operatorId: decodeOperatorId(result.receipt) };
    },

    async updateOperator(p: UpdateOperatorParams): Promise<TxResult> {
      return execute({
        functionName: "updateOperator",
        args: [p.operatorId, p.feeRecipient, p.enabled, p.policy, p.context ?? "0x"],
        gas: p.gas,
      });
    },

    async setOperatorEnabled(p: SetOperatorEnabledParams): Promise<TxResult> {
      return execute({ functionName: "setOperatorEnabled", args: [p.operatorId, p.enabled], gas: p.gas });
    },

    async transferOperatorOwnership(p: TransferOperatorOwnershipParams): Promise<TxResult> {
      return execute({
        functionName: "transferOperatorOwnership",
        args: [p.operatorId, p.newOwner],
        gas: p.gas,
      });
    },

    async acceptOperatorOwnership(p: AcceptOperatorOwnershipParams): Promise<TxResult> {
      return execute({ functionName: "acceptOperatorOwnership", args: [p.operatorId], gas: p.gas });
    },

    async createVenue(p: CreateVenueParams): Promise<CreateVenueResult> {
      const result = await execute({
        functionName: "createVenue",
        args: [p.operatorId, p.marketType, toTuple(p.config)],
        gas: p.gas,
      });
      return { ...result, venueId: decodeVenueId(result.receipt) };
    },

    async updateVenue(p: UpdateVenueParams): Promise<TxResult> {
      return execute({
        functionName: "updateVenue",
        args: [p.operatorId, p.venueId, toTuple(p.config)],
        gas: p.gas,
      });
    },

    async setVenueEnabled(p: SetVenueEnabledParams): Promise<TxResult> {
      return execute({
        functionName: "setVenueEnabled",
        args: [p.operatorId, p.venueId, p.creationEnabled],
        gas: p.gas,
      });
    },
  };
}

// ============================================================================
// Control plane — operators + typed venues (MarketsCore).
//
// These are INDEXER reads (the `Operator` / `Venue` entities the indexer's
// core handler upserts from MarketsCore events), NOT chain reads: a directory
// paginates/filters/counts server-side via Hasura, exactly like the market
// list — it never fans out N eth_calls, and it works against a deployment
// whose MarketsCore address isn't configured in the client. Writes
// (registerOperator / createVenue / …) still go on-chain via
// client.createOperatorAdmin; those are a separate, wallet-signed surface.
// ============================================================================

/**
 * An operator as the indexer sees it (mirror of the `Operator` entity).
 *
 * @category administration
 */
export type IndexedOperator = {
  /** operatorId (uint32) as a number — the on-chain id AND the entity primary key. */
  operatorId: number;
  /** Owner address (lowercased). */
  owner: string;
  /** Default fee recipient for the operator's venues (lowercased). */
  feeRecipient: string;
  /** The registry-level kill switch — false disables the operator. */
  enabled: boolean;
  /** Operator-wide IVenuePolicy (lowercased); zero-address = none. */
  policy: string;
  /**
   *  Opaque operator-supplied metadata bytes (hex, 0x-prefixed; '0x' when empty).
   *  The chain attaches no semantics — off-chain data only.
   */
  context: string;
  /** Pending incoming owner staged by a two-step transfer (lowercased); null if none in flight. */
  pendingOwner: string | null;
  /** Timestamp (unix seconds) the operator was registered. */
  createdAtTimestamp: string;
  /** Timestamp (unix seconds) of the last update to the row. Somnia blocks are
   *  ~100ms, so roughly ten consecutive blocks share one value — use
   *  {@link updatedAtBlock} when you need to tell two writes apart. */
  updatedAtTimestamp: string;
  /**
   *  Block number of the last CONTROL-PLANE update to the row — NON-DECREASING,
   *  and finer-grained than the second-granularity timestamp beside it, which
   *  about ten consecutive Somnia blocks share.
   *
   *  Not every write to the row moves it, and a consumer must not read it as
   *  "the row was not written". The indexer stamps it on `OperatorRegistered`,
   *  `OperatorUpdated`, `OperatorEnabledChanged`, the three ownership-transfer
   *  events, and `VenueCreated` — that last one because creating a venue bumps
   *  this row's `venueCount`. It is NOT stamped on the denormalized rollups —
   *  market counts, cumulative volume, collected fees — which rewrite the row
   *  with this column carried through unchanged.
   *
   *  It is not a write counter and does not identify a write: two updates in the
   *  SAME block carry the same number, so this distinguishes updates ACROSS
   *  blocks and nothing narrower. A consumer that must not miss a write in a
   *  single block needs the events, not this column.
   *
   *  `bigint`, unlike the raw-string columns beside it, because SDK-TYPE-007
   *  requires protocol integers to be exact at the boundary — the generated wire
   *  string is mapped here rather than exposed. The neighbouring strings predate
   *  that seam.
   */
  updatedAtBlock: bigint;
  /** Number of venues created under the operator (soft-disabled included). */
  venueCount: number;
  /** Number of markets created under the operator. */
  marketCount: number;
  /** Cumulative binary quote/collateral volume across the operator's markets (raw). */
  cumulativeQuoteVolume: string;
  /** Cumulative protocol fees collected across the operator's markets (raw). */
  protocolFeesCollected: string;
  /** Cumulative settlement fees collected across the operator's markets (raw). */
  settlementFeesCollected: string;
  /** Cumulative builder fees routed across the operator's markets (raw). */
  builderFeesCollected: string;
};

/**
 * A venue as the indexer sees it (mirror of the `Venue` entity).
 *
 * @category administration
 */
export type IndexedVenue = {
  /** Opaque bytes32 venue id (== entity id); NOT a human label. */
  venueId: string;
  /** The operator the venue belongs to. */
  operatorId: number;
  /** bytes4 market-type id the venue is pinned to, forever (hex). */
  marketType: string;
  /** Type-specific fee params, opaque to the registry (bytes hex). */
  feeParams: string;
  /** Per-venue fee recipient override (lowercased); zero-address falls back to the operator's. */
  feeRecipientOverride: string;
  /** Per-venue IVenuePolicy (lowercased); zero-address = none. */
  policy: string;
  /** Per-venue EIP-712 signer (lowercased); non-zero ⇒ creation requires a venue sig. */
  signer: string;
  /** Whether new markets may currently be created under the venue. */
  creationEnabled: boolean;
  /**
   *  Opaque venue-supplied metadata bytes (hex, 0x-prefixed; '0x' when empty).
   *  The chain attaches no semantics — off-chain data only.
   */
  context: string;
  /** Timestamp (unix seconds) the venue was created. */
  createdAtTimestamp: string;
  /** Timestamp (unix seconds) of the last update to the row. Somnia blocks are
   *  ~100ms, so roughly ten consecutive blocks share one value — use
   *  {@link updatedAtBlock} when you need to tell two writes apart. */
  updatedAtTimestamp: string;
  /**
   *  Block number of the last CONTROL-PLANE update to the row — NON-DECREASING,
   *  and finer-grained than the second-granularity timestamp beside it, which
   *  about ten consecutive Somnia blocks share.
   *
   *  Not every write to the row moves it, and a consumer must not read it as
   *  "the row was not written". The indexer stamps it on `VenueCreated`,
   *  `VenueUpdated` and `VenueEnabledChanged` — and on NO operator event. An
   *  ownership transfer or an operator update moves
   *  {@link IndexedOperator.updatedAtBlock} and leaves this marker exactly where
   *  it was, so do not difference a venue marker expecting to see one. It is NOT
   *  stamped on the denormalized rollups either — market counts, cumulative
   *  volume, collected fees — which rewrite the row with this column carried
   *  through unchanged.
   *
   *  It is not a write counter and does not identify a write: two updates in the
   *  SAME block carry the same number, so this distinguishes updates ACROSS
   *  blocks and nothing narrower. A consumer that must not miss a write in a
   *  single block needs the events, not this column.
   *
   *  `bigint`, unlike the raw-string columns beside it, because SDK-TYPE-007
   *  requires protocol integers to be exact at the boundary — the generated wire
   *  string is mapped here rather than exposed. The neighbouring strings predate
   *  that seam.
   */
  updatedAtBlock: bigint;
  /** Number of markets created under the venue. */
  marketCount: number;
  /** Cumulative binary quote/collateral volume across the venue's markets (raw). */
  cumulativeQuoteVolume: string;
  /** Cumulative protocol fees collected across the venue's markets (raw). */
  protocolFeesCollected: string;
  /** Cumulative settlement fees collected across the venue's markets (raw). */
  settlementFeesCollected: string;
  /** Cumulative builder fees routed across the venue's markets (raw). */
  builderFeesCollected: string;
};

/**
 *  Server-side filter for the operator directory. Every field optional (an
 *  omitted field does not constrain). Applied as a Hasura `where`.
 *
 * @category administration
 */
export type OperatorFilter = {
  /** Restrict to operators owned by this address (case-insensitive). */
  owner?: string;
  /** Restrict to enabled (true) / disabled (false) operators. */
  enabled?: boolean;
};

// `venueCount` is a denormalized column on the Operator row (the indexer bumps
// it on VenueCreated) — read as O(1), NOT by counting the `venues` relationship,
// which wouldn't scale to thousands of venues per operator.
// prettier-ignore
const OperatorFields = graphql(`
  fragment OperatorFields on Operator {
    operatorId
    owner
    feeRecipient
    enabled
    policy
    context
    pendingOwner
    venueCount
    createdAtTimestamp
    updatedAtTimestamp
    updatedAtBlock
    marketCount
    cumulativeQuoteVolume
    protocolFeesCollected
    settlementFeesCollected
    builderFeesCollected
  }
`);

// prettier-ignore
const VenueFields = graphql(`
  fragment VenueFields on Venue {
    venueId
    operatorId
    marketType
    feeParams
    feeRecipientOverride
    policy
    signer
    creationEnabled
    context
    createdAtTimestamp
    updatedAtTimestamp
    updatedAtBlock
    marketCount
    cumulativeQuoteVolume
    protocolFeesCollected
    settlementFeesCollected
    builderFeesCollected
  }
`);

/**
 *  List operators, newest-first by id, paginated. Every field of `opts` is
 *  optional; pass `owner` to scope to one owner's operators (the exact,
 *  indexed equivalent of "my operators" — no log scan), `enabled` to filter by
 *  the kill switch, and `limit`/`offset` to page. Venue counts read the
 *  denormalized `Operator.venueCount` column (O(1) — NOT the `venues`
 *  relationship, which wouldn't scale to thousands of venues per operator).
 */
export async function listOperators(
  opts: OperatorFilter & { limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<IndexedOperator[]> {
  const data = await IndexerRead.gqlRequest(
    OperatorsQuery,
    { where: operatorWhere(opts), limit: opts.limit ?? 20, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.Operator.map((r) => toIndexedOperator(r, "Operators"));
}

/** The wire shape of a Hasura `BigInt`: unsigned decimal digits, nothing else. */
const UNSIGNED_DECIMAL = /^\d+$/;

/** Parse the wire `updatedAtBlock` into the `bigint` the public row declares.
 *
 *  `BigInt()` is NOT a validation boundary and cannot be used as one. It coerces
 *  `""` and whitespace to `0n`, reads `"0x10"` as 16, and accepts a leading
 *  minus - so the malformed values likeliest to arrive would have passed through
 *  as plausible block numbers rather than raising. A blank marker becoming block
 *  0 is the worst of them: the probe publishes it, and a row that went blank and
 *  back would read as two writes and page. The shape is checked first, and
 *  `BigInt` only converts what has already been proven to be digits.
 *
 *  The RUNTIME TYPE is checked before the shape, and that ordering is load
 *  bearing rather than defensive habit. `RegExp.test` coerces its argument to a
 *  string, so a JSON NUMBER on the wire would be stringified and sail through
 *  `^\d+$`. By then `JSON.parse` has already rounded it through an IEEE double:
 *  9007199254740993 arrives as 9007199254740992, matches the digits test, and
 *  converts to a bigint that is silently off by one - destroying the exact
 *  boundary this mapper exists to establish. The static type says `string`, but
 *  the value comes off the wire, so the type is a claim about the schema and not
 *  a guarantee about the bytes. Hence `typeof` first (SDK-TYPE-007).
 *
 *  The raise matters because this runs AFTER `gqlRequest` has normalized
 *  transport and GraphQL errors, so anything thrown here escapes the public
 *  boundary uncaught by a caller narrowing on `IndexerError`. `operation` is the
 *  GraphQL document name, per the SDK's convention. */
function toUpdatedAtBlock(raw: string, operation: string): bigint {
  if (typeof raw !== "string" || !UNSIGNED_DECIMAL.test(raw)) {
    throw new IndexerError(operation, `row carried a non-numeric updatedAtBlock: ${JSON.stringify(raw)}`);
  }
  return BigInt(raw);
}

/** The one place the generated Operator row becomes the public contract.
 *
 *  A spread with one override rather than a field-by-field copy: the compiler
 *  still checks the result against {@link IndexedOperator}, so a column the
 *  public type declares and the query stops selecting is a build error, while a
 *  column added to both needs no edit here. `updatedAtBlock` is the only field
 *  that is not its wire representation - see its doc for why (SDK-TYPE-007). */
function toIndexedOperator(r: ResultOf<typeof OperatorFields>, operation: string): IndexedOperator {
  return { ...r, updatedAtBlock: toUpdatedAtBlock(r.updatedAtBlock, operation) };
}

/** As {@link toIndexedOperator}, for the Venue row. */
function toIndexedVenue(r: ResultOf<typeof VenueFields>, operation: string): IndexedVenue {
  return { ...r, updatedAtBlock: toUpdatedAtBlock(r.updatedAtBlock, operation) };
}

/**
 *  Server-side COUNT of operators matching a filter (Hasura `Operator_aggregate`),
 *  so a directory learns its total without loading every row. `_aggregate` is
 *  hidden from envio's public role — this needs the privileged `headers`
 *  (server-only), like {@link countBinaryMarkets}.
 *
 *  Without that header the total is bounded by
 *  {@link IndexerRead.COUNT_FALLBACK_CAP}; `Operator` is orders of magnitude
 *  below it.
 */
export async function countOperators(
  opts: OperatorFilter,
  indexerUrl: IndexerRead.Source,
  headers?: Record<string, string>,
): Promise<number> {
  return IndexerRead.aggregateCount(OperatorCountDocuments, operatorWhere(opts), indexerUrl, headers);
}

/**
 *  Fetch one operator by id (null if never registered — a directory or a
 *  hand-typed id can miss).
 */
export async function getOperator(operatorId: number, indexerUrl: IndexerRead.Source): Promise<IndexedOperator | null> {
  const data = await IndexerRead.gqlRequest(OperatorByPkQuery, { id: String(operatorId) }, indexerUrl);
  return data.Operator_by_pk ? toIndexedOperator(data.Operator_by_pk, "OperatorByPk") : null;
}

/**
 *  List venues, creation-order, optionally scoped to one operator and/or
 *  market type and/or the venue-level creation flag. Paginated (venues per
 *  operator are few, but a global venue browse can be large).
 */
export async function listVenues(
  opts: {
    operatorId?: number;
    marketType?: string;
    creationEnabled?: boolean;
    limit?: number;
    offset?: number;
  } = {},
  indexerUrl: IndexerRead.Source,
): Promise<IndexedVenue[]> {
  const where: Record<string, unknown> = {};
  if (opts.operatorId != null) where.operatorId = { _eq: opts.operatorId };
  if (opts.marketType != null) where.marketType = { _eq: opts.marketType.toLowerCase() };
  if (opts.creationEnabled != null) where.creationEnabled = { _eq: opts.creationEnabled };
  const data = await IndexerRead.gqlRequest(
    VenuesQuery,
    { where, limit: opts.limit ?? 100, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.Venue.map((r) => toIndexedVenue(r, "Venues"));
}

/**
 *  Server-side COUNT of venues matching a filter (Hasura `Venue_aggregate`) —
 *  so a per-operator venue list paginates against a real total instead of
 *  fetching every venue. Privileged `_aggregate` role (server-only), like
 *  {@link countOperators}.
 *
 *  Bounded by {@link IndexerRead.COUNT_FALLBACK_CAP}, like {@link countOperators};
 *  `Venue` is far below it.
 */
export async function countVenues(
  opts: { operatorId?: number; marketType?: string },
  indexerUrl: IndexerRead.Source,
  headers?: Record<string, string>,
): Promise<number> {
  const where: Record<string, unknown> = {};
  if (opts.operatorId != null) where.operatorId = { _eq: opts.operatorId };
  if (opts.marketType != null) where.marketType = { _eq: opts.marketType.toLowerCase() };
  return IndexerRead.aggregateCount(VenueCountDocuments, where, indexerUrl, headers);
}

/** Fetch one venue by its opaque bytes32 id (null if unknown). */
export async function getVenue(venueId: string, indexerUrl: IndexerRead.Source): Promise<IndexedVenue | null> {
  const data = await IndexerRead.gqlRequest(VenueByPkQuery, { id: venueId.toLowerCase() }, indexerUrl);
  return data.Venue_by_pk ? toIndexedVenue(data.Venue_by_pk, "VenueByPk") : null;
}

/**
 *  Build a Hasura `where` for the operator directory. Only set fields are
 *  added — a bare `{_eq: undefined}` would collapse to IS NULL and drop rows.
 */
function operatorWhere(f: OperatorFilter): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (f.owner != null) where.owner = { _eq: f.owner.toLowerCase() };
  if (f.enabled != null) where.enabled = { _eq: f.enabled };
  return where;
}

// ---------------------------------------------------------------------------
// Typed documents for the reads above. Hoisted here (rather than inline at each
// call site) to keep this file's reading order: functions first, GraphQL after.
// Result and variable types are derived from the committed schema snapshot.

// prettier-ignore
const OperatorsQuery = graphql(`
  query Operators($where: Operator_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Operator(where: $where, order_by: {operatorId: desc}, limit: $limit, offset: $offset) { ...OperatorFields }
       }
`);

// prettier-ignore
const OperatorByPkQuery = graphql(`
  query OperatorByPk($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block } Operator_by_pk(id: $id) { ...OperatorFields } }
`);

// prettier-ignore
const VenuesQuery = graphql(`
  query Venues($where: Venue_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Venue(where: $where, order_by: {createdAtTimestamp: asc}, limit: $limit, offset: $offset) { ...VenueFields }
       }
`);

// prettier-ignore
const VenueByPkQuery = graphql(`
  query VenueByPk($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block } Venue_by_pk(id: $id) { ...VenueFields } }
`);

// The two count documents for `Operator` (see IndexerRead.CountDocuments).
const OperatorCountDocuments: IndexerRead.CountDocuments<Operator_Bool_Exp> = {
  table: "Operator",
  // prettier-ignore
  aggregate: graphql(`
    query OperatorCount($where: Operator_bool_exp!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      total: Operator_aggregate(where: $where) { aggregate { count } }
    }
  `),
  // prettier-ignore
  fallback: graphql(`
    query OperatorCountFallback($where: Operator_bool_exp!, $limit: Int!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      rows: Operator(where: $where, limit: $limit) { id }
    }
  `),
};

// The two count documents for `Venue` (see IndexerRead.CountDocuments).
const VenueCountDocuments: IndexerRead.CountDocuments<Venue_Bool_Exp> = {
  table: "Venue",
  // prettier-ignore
  aggregate: graphql(`
    query VenueCount($where: Venue_bool_exp!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      total: Venue_aggregate(where: $where) { aggregate { count } }
    }
  `),
  // prettier-ignore
  fallback: graphql(`
    query VenueCountFallback($where: Venue_bool_exp!, $limit: Int!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      rows: Venue(where: $where, limit: $limit) { id }
    }
  `),
};

/** Failures from the owner-derived `OperatorAdmin.registerOperator` operation. @category errors */
export type OperatorAdminRegisterOperatorError = SomniaMarketsSocketFailure;

/** Failures from the owner-derived `OperatorAdmin.updateOperator` operation. @category errors */
export type OperatorAdminUpdateOperatorError = SomniaMarketsSocketFailure;

/** Failures from the owner-derived `OperatorAdmin.setOperatorEnabled` operation. @category errors */
export type OperatorAdminSetOperatorEnabledError = SomniaMarketsSocketFailure;

/** Failures from the owner-derived `OperatorAdmin.transferOperatorOwnership` operation. @category errors */
export type OperatorAdminTransferOperatorOwnershipError = SomniaMarketsSocketFailure;

/** Failures from the owner-derived `OperatorAdmin.acceptOperatorOwnership` operation. @category errors */
export type OperatorAdminAcceptOperatorOwnershipError = SomniaMarketsSocketFailure;

/** Failures from the owner-derived `OperatorAdmin.createVenue` operation. @category errors */
export type OperatorAdminCreateVenueError = SomniaMarketsSocketFailure;

/** Failures from the owner-derived `OperatorAdmin.updateVenue` operation. @category errors */
export type OperatorAdminUpdateVenueError = SomniaMarketsSocketFailure;

/** Failures from the owner-derived `OperatorAdmin.setVenueEnabled` operation. @category errors */
export type OperatorAdminSetVenueEnabledError = SomniaMarketsSocketFailure;
