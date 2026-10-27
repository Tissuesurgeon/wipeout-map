// Read ABIs for the /system diagnostics view (deployed CLOB-family contracts).

import { parseAbi } from "viem";

export const binaryModuleReadAbi = parseAbi([
  "function clobFactory() view returns (address)",
  // The wired BinarySettlement singleton (settlement-extraction v2; zero pre-wire).
  "function settlement() view returns (address)",
]);

export const clobFactoryReadAbi = parseAbi(["function binaryMarketImpl() view returns (address)"]);

export const marketCreatorReadAbi = parseAbi([
  "function marketCount() view returns (uint256)",
  "function owner() view returns (address)",
  "function reactivityGasLimit() view returns (uint64)",
  "function reactivityMaxFeePerGas() view returns (uint64)",
  "function reactivityPriorityFeePerGas() view returns (uint64)",
  "function operatorId() view returns (uint32)",
  "function venueId() view returns (bytes32)",
]);

export const fakeOracleReadAbi = parseAbi([
  "function owner() view returns (address)",
  "function RECEIVER() view returns (address)",
]);

export const erc20MetaAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);
