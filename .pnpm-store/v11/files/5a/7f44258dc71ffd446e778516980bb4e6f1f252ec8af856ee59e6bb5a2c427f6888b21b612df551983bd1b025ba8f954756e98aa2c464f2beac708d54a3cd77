import type { SomniaMarketsSocketFailure } from "./config.js";
// The protocol-admin-only governance surface on BinaryMarketsModule. A
// factory-minted oracle adapter is INERT — it can be funded and armed by its
// operator, but it cannot back a market until the MODULE OWNER approves it here.
// This is the one seam an operator can't self-serve: a UI shows
// `setAdapterApproved` only to the protocol admin (gate it with
// `isModuleOwner`). Same signer doctrine as operatorAdmin.ts.

import type { Address, PublicClient } from "viem";
import { NotConfiguredError } from "./errors.js";
import type { WriterRuntime } from "./writerRuntime.js";
import type { ClientConfig } from "./config.js";
import * as MachineryAbi from "./machineryAbi.js";
import type { MachineryAdminConfig } from "./machineryWriter.js";
import * as MachineryWriter from "./machineryWriter.js";
import type { TxResult } from "./trade.js";

/** Signer configuration for the BinaryMarketsModule governance capability. */
export type { MachineryAdminConfig as GovernanceAdminConfig };

/**
 * Params for {@link GovernanceAdmin.setAdapterApproved}.
 *
 * @category administration
 */
export interface SetAdapterApprovedParams {
  /** The oracle adapter to approve or revoke on BinaryMarketsModule. */
  adapter: Address;
  /** `true` approves (adapter can back new markets); `false` revokes. */
  approved: boolean;
  /** Gas ceiling for this tx; overrides the config default. */
  gas?: bigint;
}

/**
 *  The protocol-admin governance surface on BinaryMarketsModule — the one seam
 *  an operator can't self-serve (see the module notes above). Built via
 *  `client.createGovernanceAdmin(config)` with a signer
 *  ({@link GovernanceAdminConfig}); the write is module-owner only, the reads
 *  are open chain point reads.
 *
 *  Every write throws `ContractRevertError` when the chain rejects it — at
 *  simulation, at send, or as a mined receipt with `status: "reverted"` (the
 *  reason is recovered by replaying the call at that block while the node still
 *  has the state) — and `RpcError` when the send or the receipt read does not
 *  complete. A reverted write never resolves as if it had been confirmed.
 *
 * @category administration
 */
export interface GovernanceAdmin {
  /**
   *  Approve (or revoke) an oracle adapter on the module — the inert→live gate
   *  for a factory-minted adapter. MODULE-OWNER ONLY: reverts for any other
   *  caller, so a UI shows this only to the protocol admin (see
   *  {@link GovernanceAdmin.isModuleOwner}).
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
  setAdapterApproved(p: SetAdapterApprovedParams): Promise<TxResult>;
  /** The module owner (the protocol admin). Needs `config.addresses.binaryModule`.
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
  getModuleOwner(): Promise<Address>;
  /**
   *  Whether `addr` is the module owner — gate the `setAdapterApproved` UI on
   *  this. Needs `config.addresses.binaryModule`.
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
  isModuleOwner(addr: Address): Promise<boolean>;
}

/**
 * Dependencies supplied by the owning client to its governance capability.
 *
 * @internal
 */
export interface GovernanceAdminDeps {
  getConfig: () => ClientConfig;
  getClient: () => PublicClient;
  /** The current owner lifecycle, captured before each write starts. */
  getReceiptSignal?: () => AbortSignal | undefined;
  writerRuntime?: WriterRuntime;
}

export function createGovernanceAdminWithDeps(
  config: MachineryAdminConfig,
  deps: GovernanceAdminDeps,
): GovernanceAdmin {
  const binaryModule = deps.getConfig().addresses?.binaryModule;
  const writer = MachineryWriter.makeMachineryWriter(config, deps, "createGovernanceAdmin");
  const pc = () => deps.getClient();

  function requireModule(): Address {
    if (!binaryModule) {
      throw new NotConfiguredError("config.addresses.binaryModule", "createGovernanceAdmin");
    }
    return binaryModule;
  }

  async function getModuleOwner(): Promise<Address> {
    return await pc().readContract({
      address: requireModule(),
      abi: MachineryAbi.moduleGovernanceAbi,
      functionName: "owner",
    });
  }

  return {
    async setAdapterApproved(p: SetAdapterApprovedParams): Promise<TxResult> {
      return writer.execute({
        to: requireModule(),
        abi: MachineryAbi.moduleGovernanceAbi,
        functionName: "setAdapterApproved",
        args: [p.adapter, p.approved],
        gas: p.gas,
      });
    },

    getModuleOwner,

    async isModuleOwner(addr: Address): Promise<boolean> {
      const owner = await getModuleOwner();
      return owner.toLowerCase() === addr.toLowerCase();
    },
  };
}

/** Failures from the owner-derived `GovernanceAdmin.setAdapterApproved` operation. @category errors */
export type GovernanceAdminSetAdapterApprovedError = SomniaMarketsSocketFailure;

/** Failures from the owner-derived `GovernanceAdmin.getModuleOwner` operation. @category errors */
export type GovernanceAdminGetModuleOwnerError = SomniaMarketsSocketFailure;

/** Failures from the owner-derived `GovernanceAdmin.isModuleOwner` operation. @category errors */
export type GovernanceAdminIsModuleOwnerError = SomniaMarketsSocketFailure;
