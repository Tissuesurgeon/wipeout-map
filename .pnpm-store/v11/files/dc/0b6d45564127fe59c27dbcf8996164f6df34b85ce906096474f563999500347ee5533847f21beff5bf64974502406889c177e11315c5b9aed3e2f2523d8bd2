// Public types for the SomniaLend integration (Aave v3.0 fork on Somnia
// mainnet). Reads decode UiPoolDataProviderV3's aggregated structs into these;
// amounts follow the SDK-wide rule — bigint raw units, display scaling is the
// caller's job (decimals ride along on every row).

import type { Address } from "viem";

/**
 *  SomniaLend contract addresses (see docs.somnialend.finance/deployed-contracts).
 *  Set them on `config.addresses.lend`; every lend method throws a clear error
 *  when the address it needs is unset, like the rest of `SomniaMarketsAddresses`.
 *
 * @category lending
 */
export interface LendAddresses {
  /** The Pool proxy — every user action (supply/withdraw/borrow/repay) targets it. */
  pool?: Address;
  /** PoolAddressesProvider — the market id the UiPoolDataProvider reads are keyed by. */
  poolAddressesProvider?: Address;
  /** UiPoolDataProviderV3 — the aggregated whole-market / whole-account reads. */
  uiPoolDataProvider?: Address;
  /**
   *  WrappedTokenGatewayV3 — native-SOMI wrap/unwrap periphery. Optional: only
   *  the `*Native` lender methods need it; they throw when it is unset.
   */
  wrappedTokenGateway?: Address;
}

/**
 * One SomniaLend reserve (a listed asset), decoded from the UiPoolDataProvider
 * aggregate — config, caps, live rates/indexes, liquidity, and the oracle price.
 *
 * **Details**
 *
 * Rates and indexes are Aave ray values (1e27) — convert a rate for display
 * with {@link lendRayRateToApy}. Token amounts (`availableLiquidity`,
 * `totalVariableDebt`, `totalSupplied`) are raw `decimals`-scaled units, accrued
 * to the read's block timestamp.
 *
 * **Gotchas**
 *
 * `borrowCap`/`supplyCap` are WHOLE tokens (Aave convention), not raw units — 0
 * means uncapped.
 *
 * @category lending
 */
export interface LendReserve {
  /** The underlying ERC-20 the reserve lends (approve/supply/borrow this token). */
  underlying: Address;
  /** Underlying token ticker, e.g. "USDso". */
  symbol: string;
  /** Underlying token full name. */
  name: string;
  /** Underlying token decimals (scales every raw amount on this row). */
  decimals: number;
  /** The interest-bearing aToken minted on supply (balance grows in place). */
  aToken: Address;
  /** The variable-debt token minted on borrow (balance grows with interest). */
  variableDebtToken: Address;
  /** Max borrowing power per unit of this collateral, bps (8000 = 80%). */
  ltvBps: number;
  /** Collateral value threshold (bps) past which a position can be liquidated. */
  liquidationThresholdBps: number;
  /** Liquidator bonus, bps over par (10500 = 5% bonus). */
  liquidationBonusBps: number;
  /** Slice of borrow interest diverted to the protocol treasury, bps. */
  reserveFactorBps: number;
  /** Whether supplying this reserve can back borrows at all. */
  usageAsCollateralEnabled: boolean;
  /** Whether the reserve can be borrowed. */
  borrowingEnabled: boolean;
  /** Reserve is listed and operational (false ⇒ every action reverts). */
  isActive: boolean;
  /** Frozen: existing positions stand but new supplies/borrows revert. */
  isFrozen: boolean;
  /** Paused: every action on the reserve reverts. */
  isPaused: boolean;
  /** Whether the reserve is flash-loanable. */
  flashLoanEnabled: boolean;
  /** Borrow cap in WHOLE tokens (0 = uncapped). */
  borrowCap: bigint;
  /** Supply cap in WHOLE tokens (0 = uncapped). */
  supplyCap: bigint;
  /** Un-borrowed underlying sitting in the aToken, raw units. */
  availableLiquidity: bigint;
  /** Total variable debt outstanding, raw units, accrued to the read time. */
  totalVariableDebt: bigint;
  /** Total supplied (available + borrowed), raw units, accrued to the read time. */
  totalSupplied: bigint;
  /** Annual supply rate, ray (1e27) — {@link lendRayRateToApy} for display. */
  liquidityRateRay: bigint;
  /** Annual variable borrow rate, ray (1e27). */
  variableBorrowRateRay: bigint;
  /** Supply index, ray — current aToken balance = scaled balance × this. */
  liquidityIndexRay: bigint;
  /** Variable borrow index, ray — current debt = scaled debt × this. */
  variableBorrowIndexRay: bigint;
  /** Unix seconds the reserve's stored rates/indexes were last written on-chain. */
  lastUpdateTimestamp: number;
  /** Oracle price of one whole token, in base-currency units ({@link baseCurrencyDecimals}). */
  priceInBaseCurrency: bigint;
  /** Decimals of the base currency (USD-denominated deployments use 8). */
  baseCurrencyDecimals: number;
}

/**
 * One asset the account has supplied or borrowed, inside {@link LendAccount}.
 *
 * @category lending
 */
export interface LendPosition {
  /** The underlying ERC-20 of the reserve. */
  underlying: Address;
  /** Underlying ticker (denormalized from the reserve row for display). */
  symbol: string;
  /** Underlying decimals (scales both balances below). */
  decimals: number;
  /** Current aToken balance incl. accrued interest, raw units. */
  aTokenBalance: bigint;
  /** Current variable debt incl. accrued interest, raw units. */
  variableDebt: bigint;
  /** Whether THIS account is using the supplied balance as collateral. */
  usageAsCollateralEnabled: boolean;
}

/**
 * A whole SomniaLend account: the Pool's risk aggregate plus every non-empty
 * per-reserve position, in one read.
 *
 * **Details**
 *
 * `healthFactor` is a wad (1e18): liquidation triggers below 1e18. The `*Base`
 * aggregates are denominated in the oracle base currency
 * (`baseCurrencyDecimals`, USD/8dp on this deployment).
 *
 * **Gotchas**
 *
 * A debt-free account reports `maxUint256` ("infinite") as its `healthFactor`.
 * The `*Base` aggregates are cross-asset totals, not token amounts.
 *
 * @category lending
 */
export interface LendAccount {
  /** Total collateral backing the account, base-currency units. */
  totalCollateralBase: bigint;
  /** Total debt owed, base-currency units. */
  totalDebtBase: bigint;
  /** Remaining borrowing power, base-currency units. */
  availableBorrowsBase: bigint;
  /** Account-weighted liquidation threshold, bps. */
  currentLiquidationThresholdBps: number;
  /** Account-weighted max LTV, bps. */
  ltvBps: number;
  /** Health factor, wad (1e18); < 1e18 ⇒ liquidatable; maxUint256 ⇒ no debt. */
  healthFactor: bigint;
  /** Decimals of the base currency the `*Base` fields use. */
  baseCurrencyDecimals: number;
  /** Every reserve the account holds a supply or debt in (empty rows dropped). */
  positions: LendPosition[];
}
