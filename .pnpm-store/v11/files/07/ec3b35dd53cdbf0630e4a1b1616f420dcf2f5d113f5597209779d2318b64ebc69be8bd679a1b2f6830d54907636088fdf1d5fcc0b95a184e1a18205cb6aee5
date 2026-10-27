// MarketsCore ABI — the WRITE surface for the operator/venue control plane
// (register/update operators, create/update venues). Tuple shapes mirror the
// VenueConfig struct in smart-contracts/src/MarketsCore.sol. IVenuePolicy is a
// plain `address` at the ABI level. READS come from the indexer (see
// operatorAdmin.ts), so there is no read ABI here — only the write ABI + the events
// createOperatorAdmin decodes off its own tx receipts.

import { parseAbi } from "viem";

export const marketsCoreWriteAbi = parseAbi([
  "function registerOperator(address feeRecipient, bool enabled, address policy, bytes context) returns (uint32 operatorId)",
  "function updateOperator(uint32 operatorId, address feeRecipient, bool enabled, address policy, bytes context)",
  "function setOperatorEnabled(uint32 operatorId, bool enabled)",
  "function transferOperatorOwnership(uint32 operatorId, address newOwner)",
  "function acceptOperatorOwnership(uint32 operatorId)",
  "function createVenue(uint32 operatorId, bytes4 marketType, (bytes feeParams, address feeRecipientOverride, address policy, address signer, bool creationEnabled, bytes context) config) returns (bytes32 venueId)",
  "function updateVenue(uint32 operatorId, bytes32 venueId, (bytes feeParams, address feeRecipientOverride, address policy, address signer, bool creationEnabled, bytes context) config)",
  "function setVenueEnabled(uint32 operatorId, bytes32 venueId, bool creationEnabled)",
]);

// Decoded from tx receipts by createOperatorAdmin (registerOperator /
// createVenue return values aren't readable off an external-signer write, only
// the events they emit).
export const marketsCoreEventsAbi = parseAbi([
  "event OperatorRegistered(uint32 indexed operatorId, address indexed owner, address indexed feeRecipient, bool enabled, address policy, bytes context)",
  "event OperatorOwnershipTransferred(uint32 indexed operatorId, address indexed oldOwner, address indexed newOwner)",
  "event VenueCreated(uint32 indexed operatorId, bytes32 indexed venueId, bytes4 indexed marketType, bytes feeParams, address feeRecipientOverride, address policy, address signer, bool creationEnabled, bytes context)",
]);

// BinaryMarketsModule's venue-fee-params encoder + protocol constants — reading
// these off the deployed module (rather than re-deriving the version tag /
// struct encoding client-side) keeps the explorer's venue-creation form
// drift-proof against a future `FEE_PARAMS_VERSION` bump.
export const binaryModuleFeeParamsAbi = parseAbi([
  "function encodeVenueFeeParams((uint64 makerFeeBps, uint64 takerFeeBps, uint64 maxBuilderFeeBps, uint64 routingFeeBps, uint64 settlementFeeBps, uint8 voidPolicy) vp) pure returns (bytes)",
  "function FEE_PARAMS_VERSION() view returns (uint8)",
  "function MAX_FEE_BPS() view returns (uint256)",
]);
