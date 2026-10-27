// Write ABIs for market lifecycle actions (resolve / faucet / poke).
// Complete-set mint/burn lives on the BinaryPool (binaryPoolWriteAbi in
// tradeAbi.ts); redemption lives on the BinarySettlement singleton
// (binarySettlementAbi in readsAbi.ts), module-routed for traders
// (binaryModuleWriteAbi in moduleAbi.ts).

import { parseAbi } from "viem";

export const binaryMarketWriteAbi = parseAbi([
  // No-op kept for ABI stability with adapters that probe `poke()`.
  "function poke()",
  // The dead-oracle escape hatch: permissionless once
  // `expiry + settlementWindow` has elapsed, after which both sides redeem at
  // 1/N. Flips the market Voided on the MARKET contract, bypassing the module —
  // so `syncSettlement` is still needed afterwards to release the hub earmark.
  // Reverts `WrongStatus` if already terminal, `SettlementWindowOpen` if the
  // oracle still has time.
  "function voidExpired()",
]);

export const fakeOracleAbi = parseAbi([
  "function resolve(address market, uint8 outcomeIdx)",
  "function voidMarket(address market)",
]);

export const testUsdcAbi = parseAbi(["function faucet(uint256 amount)"]);
