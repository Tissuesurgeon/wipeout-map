// Minimal ABIs for the SomniaLend money market (an Aave v3.0 fork on Somnia
// mainnet — docs.somnialend.finance). Signatures generated from the VERIFIED
// deployed ABIs (Blockscout, chain 5031): Pool impl 0x1c53629c…, UiPoolDataProviderV3
// 0x5ef828E2…, WrappedTokenGatewayV3 0xc97d0602…. Do not hand-edit the
// getReservesData tuple — Aave v3 minor versions (3.1/3.2) reshaped it, so it
// must match THIS deployment exactly or decoding fails at runtime.

import { parseAbi, type Abi } from "viem";

/**
 *  SomniaLend Pool (Aave v3 `IPool` subset) — the user actions the SDK sends
 *  (supply / withdraw / borrow / repay and the collateral toggle) plus the
 *  account-aggregate and per-reserve reads backing the lend client's `getAccount`.
 *
 * @category lending
 */
export const lendPoolAbi = parseAbi([
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
  "function withdraw(address asset, uint256 amount, address to) returns (uint256)",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)",
  "function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)",
  "function repayWithATokens(address asset, uint256 amount, uint256 interestRateMode) returns (uint256)",
  "function setUserUseReserveAsCollateral(address asset, bool useAsCollateral)",
  // (totalCollateralBase, totalDebtBase, availableBorrowsBase, currentLiquidationThreshold, ltv, healthFactor)
  "function getUserAccountData(address user) view returns (uint256, uint256, uint256, uint256, uint256, uint256)",
  "function getReservesList() view returns (address[])",
  // ReserveData (v3.0 layout) — the SDK only reads aTokenAddress / variableDebtTokenAddress
  // out of it (native-flow token resolution), but the tuple must match in full to decode.
  "function getReserveData(address asset) view returns (((uint256 data) configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))",
]);

// Widened to string[] on purpose: the 54-field tuple blows TS's instantiation
// depth in parseAbi's type-level parser, so this ABI is typed as plain `Abi`
// (runtime parsing is unaffected) and reads.ts types the decoded values itself.
const lendUiPoolDataProviderSignatures: string[] = [
  "function getReservesData(address provider) view returns ((address underlyingAsset, string name, string symbol, uint256 decimals, uint256 baseLTVasCollateral, uint256 reserveLiquidationThreshold, uint256 reserveLiquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen, uint128 liquidityIndex, uint128 variableBorrowIndex, uint128 liquidityRate, uint128 variableBorrowRate, uint128 stableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint256 availableLiquidity, uint256 totalPrincipalStableDebt, uint256 averageStableRate, uint256 stableDebtLastUpdateTimestamp, uint256 totalScaledVariableDebt, uint256 priceInMarketReferenceCurrency, address priceOracle, uint256 variableRateSlope1, uint256 variableRateSlope2, uint256 stableRateSlope1, uint256 stableRateSlope2, uint256 baseStableBorrowRate, uint256 baseVariableBorrowRate, uint256 optimalUsageRatio, bool isPaused, bool isSiloedBorrowing, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt, bool flashLoanEnabled, uint256 debtCeiling, uint256 debtCeilingDecimals, uint8 eModeCategoryId, uint256 borrowCap, uint256 supplyCap, uint16 eModeLtv, uint16 eModeLiquidationThreshold, uint16 eModeLiquidationBonus, address eModePriceSource, string eModeLabel, bool borrowableInIsolation)[], (uint256 marketReferenceCurrencyUnit, int256 marketReferenceCurrencyPriceInUsd, int256 networkBaseTokenPriceInUsd, uint8 networkBaseTokenPriceDecimals))",
  "function getUserReservesData(address provider, address user) view returns ((address underlyingAsset, uint256 scaledATokenBalance, bool usageAsCollateralEnabledOnUser, uint256 stableBorrowRate, uint256 scaledVariableDebt, uint256 principalStableDebt, uint256 stableBorrowLastUpdateTimestamp)[], uint8)",
];
/**
 *  UiPoolDataProviderV3 — Aave's aggregated read: the whole market and a user's
 *  every position in one eth_call each (see the signature const above for the
 *  verified v3.0 tuple shape; typed as plain `Abi` deliberately).
 *
 * @category lending
 */
export const lendUiPoolDataProviderAbi: Abi = parseAbi(lendUiPoolDataProviderSignatures);

/**
 *  WrappedTokenGatewayV3 — wraps/unwraps native SOMI around the WSOMI reserve so
 *  users lend/borrow the native token without touching WSOMI themselves. The
 *  v3.0 gateway takes the Pool address as its first argument on every call.
 *
 * @category lending
 */
export const lendGatewayAbi = parseAbi([
  "function depositETH(address pool, address onBehalfOf, uint16 referralCode) payable",
  "function withdrawETH(address pool, uint256 amount, address to)",
  "function borrowETH(address pool, uint256 amount, uint256 interestRateMode, uint16 referralCode)",
  "function repayETH(address pool, uint256 amount, uint256 interestRateMode, address onBehalfOf) payable",
  "function getWETHAddress() view returns (address)",
]);

/**
 *  Aave variable-debt-token credit delegation — `borrowNative` routes the borrow
 *  through the gateway, so the user must first delegate borrowing power on the
 *  WSOMI variable debt token to it (`approveDelegation`); `borrowAllowance`
 *  reads the remaining delegated headroom.
 *
 * @category lending
 */
export const lendDebtTokenAbi = parseAbi([
  "function approveDelegation(address delegatee, uint256 amount)",
  "function borrowAllowance(address fromUser, address toUser) view returns (uint256)",
]);
