// Chain reads for SomniaLend — everything comes from two aggregated
// UiPoolDataProviderV3 calls plus the Pool's account-risk aggregate; no indexer
// involvement. Balances are accrued from the stored indexes to the client's
// clock with Aave's own interest math (lend/math.ts), so what we report matches
// what the Pool would settle.
import * as LendAbi from "./lendAbi.js";
import * as LendMath from "./math.js";
// marketReferenceCurrencyUnit is 10^n; recover n (defensive fallback to 8, the
// Aave USD-market convention, if the unit is somehow not a power of ten).
function baseCurrencyDecimalsOf(unit) {
    const s = unit.toString();
    return /^10*$/.test(s) ? s.length - 1 : 8;
}
async function fetchReservesData(targets, client) {
    // The provider ABI is typed as plain `Abi` (see lendAbi.ts), so the return
    // type is unknown — type the decoded value ourselves.
    const [rows, baseCurrency] = (await client.readContract({
        address: targets.uiPoolDataProvider,
        abi: LendAbi.lendUiPoolDataProviderAbi,
        functionName: "getReservesData",
        args: [targets.poolAddressesProvider],
    }));
    return { raw: [...rows], baseCurrencyDecimals: baseCurrencyDecimalsOf(baseCurrency.marketReferenceCurrencyUnit) };
}
function toReserve(r, baseCurrencyDecimals, nowSec) {
    const liquidityIndexNow = LendMath.accrueLinear(r.liquidityIndex, r.liquidityRate, r.lastUpdateTimestamp, nowSec);
    const borrowIndexNow = LendMath.accrueCompounded(r.variableBorrowIndex, r.variableBorrowRate, r.lastUpdateTimestamp, nowSec);
    const totalVariableDebt = LendMath.rayMul(r.totalScaledVariableDebt, borrowIndexNow);
    return {
        underlying: r.underlyingAsset,
        symbol: r.symbol,
        name: r.name,
        decimals: Number(r.decimals),
        aToken: r.aTokenAddress,
        variableDebtToken: r.variableDebtTokenAddress,
        ltvBps: Number(r.baseLTVasCollateral),
        liquidationThresholdBps: Number(r.reserveLiquidationThreshold),
        liquidationBonusBps: Number(r.reserveLiquidationBonus),
        reserveFactorBps: Number(r.reserveFactor),
        usageAsCollateralEnabled: r.usageAsCollateralEnabled,
        borrowingEnabled: r.borrowingEnabled,
        isActive: r.isActive,
        isFrozen: r.isFrozen,
        isPaused: r.isPaused,
        flashLoanEnabled: r.flashLoanEnabled,
        borrowCap: r.borrowCap,
        supplyCap: r.supplyCap,
        availableLiquidity: r.availableLiquidity,
        totalVariableDebt,
        totalSupplied: r.availableLiquidity + totalVariableDebt,
        liquidityRateRay: r.liquidityRate,
        variableBorrowRateRay: r.variableBorrowRate,
        liquidityIndexRay: liquidityIndexNow,
        variableBorrowIndexRay: borrowIndexNow,
        lastUpdateTimestamp: Number(r.lastUpdateTimestamp),
        priceInBaseCurrency: r.priceInMarketReferenceCurrency,
        baseCurrencyDecimals,
    };
}
/**
 *  Every SomniaLend reserve with config, caps, live rates, and oracle price —
 *  one UiPoolDataProvider eth_call. Chain read (current to head); see
 *  {@link LendReserve} for units.
 */
export async function listLendReserves(targets, client) {
    const { raw, baseCurrencyDecimals } = await fetchReservesData(targets, client);
    const nowSec = Math.floor(Date.now() / 1000);
    return raw.map((r) => toReserve(r, baseCurrencyDecimals, nowSec));
}
/**
 *  A whole SomniaLend account — the Pool's risk aggregate (health factor,
 *  borrowing power) joined with every non-empty per-reserve position. Three
 *  pipelined eth_calls. Chain read (current to head).
 */
export async function getLendAccount(account, targets, client) {
    const [accountData, userRows, reservesData] = await Promise.all([
        client.readContract({
            address: targets.pool,
            abi: LendAbi.lendPoolAbi,
            functionName: "getUserAccountData",
            args: [account],
        }),
        client
            .readContract({
            address: targets.uiPoolDataProvider,
            abi: LendAbi.lendUiPoolDataProviderAbi,
            functionName: "getUserReservesData",
            args: [targets.poolAddressesProvider, account],
        })
            .then((r) => [...r[0]]),
        fetchReservesData(targets, client),
    ]);
    const nowSec = Math.floor(Date.now() / 1000);
    const byUnderlying = new Map(reservesData.raw.map((r) => [r.underlyingAsset.toLowerCase(), r]));
    const positions = [];
    for (const u of userRows) {
        if (u.scaledATokenBalance === 0n && u.scaledVariableDebt === 0n)
            continue;
        const r = byUnderlying.get(u.underlyingAsset.toLowerCase());
        if (!r)
            continue; // a reserve the provider no longer reports — skip rather than mislabel
        positions.push({
            underlying: u.underlyingAsset,
            symbol: r.symbol,
            decimals: Number(r.decimals),
            aTokenBalance: LendMath.rayMul(u.scaledATokenBalance, LendMath.accrueLinear(r.liquidityIndex, r.liquidityRate, r.lastUpdateTimestamp, nowSec)),
            variableDebt: LendMath.rayMul(u.scaledVariableDebt, LendMath.accrueCompounded(r.variableBorrowIndex, r.variableBorrowRate, r.lastUpdateTimestamp, nowSec)),
            usageAsCollateralEnabled: u.usageAsCollateralEnabledOnUser,
        });
    }
    const [totalCollateralBase, totalDebtBase, availableBorrowsBase, liqThreshold, ltv, healthFactor] = accountData;
    return {
        totalCollateralBase,
        totalDebtBase,
        availableBorrowsBase,
        currentLiquidationThresholdBps: Number(liqThreshold),
        ltvBps: Number(ltv),
        // The Pool reports maxUint256 ("infinite") for a debt-free account.
        healthFactor,
        baseCurrencyDecimals: reservesData.baseCurrencyDecimals,
        positions,
    };
}
