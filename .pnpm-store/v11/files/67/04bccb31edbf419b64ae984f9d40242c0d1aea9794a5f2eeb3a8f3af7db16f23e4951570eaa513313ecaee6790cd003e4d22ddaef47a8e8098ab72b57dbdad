# Lend — SomniaLend through the SDK

SomniaLend is a third-party money market on Somnia mainnet and testnet (an Aave v3.0 fork —
[docs.somnialend.finance](https://docs.somnialend.finance/)). The SDK wraps its
deployed contracts behind the `client.lend` namespace,
so trading capital can earn while idle: supply USDso between sessions, post it
as collateral, borrow working capital against it.

It lives on the master client as the `lend` namespace. Because SomniaLend is
third-party, its addresses are not in the deployments manifests — wire them in
config, with the published deployments available as constants:

```ts
import { SOMNIA_MAINNET_LEND } from "@somnia-chain/markets-sdk";

const exchange = new SomniaMarkets({
  ...config,
  addresses: { ...addresses, lend: SOMNIA_MAINNET_LEND },
});

const lend = exchange.client.lend;
```

`SOMNIA_MAINNET_LEND` (chain 5031) and `SOMNIA_TESTNET_LEND` (chain 50312)
carry the two published deployments (Pool, PoolAddressesProvider,
UiPoolDataProviderV3, WrappedTokenGatewayV3), verified against the on-chain
contracts. Set one as `addresses.lend` and reach the surface through
`client.lend`; that is the only entry point, so a lend read always rides the
client's own chain transport.

Everything else you need without the client comes from the root entry
(`@somnia-chain/markets-sdk`): the types, both deployment constants, the
ray-math helpers (`lendRayRateToApy`, `rayMul`, …) and the verified minimal ABIs.

Targeting a different deployment means a **different client** — the addresses and
the chain travel together, so `new SomniaMarkets({ chain, wsRpcUrl, addresses: {
lend } })`. (A `createLend(client, addresses)` factory used to be exported; it took
a whole client to use two of its members, and let one chain's addresses be grafted
onto another chain's socket, which type-checked and silently read nothing.)

## Reads

Two calls cover the whole surface — both are chain reads over the client's
WebSocket, current to head, no indexer involvement (`useLendReserves` and
`useLendAccount` in `@somnia-chain/markets-sdk/react` wrap them for components):

```ts
const reserves = await lend.listReserves(); // every listed asset
const account = await lend.getAccount(me); // health factor + positions
```

`listReserves` is one aggregated `eth_call` (UiPoolDataProviderV3): per reserve
you get the config (LTV / liquidation threshold / caps / flags), live rates and
indexes, available liquidity, total debt, and the oracle price. `getAccount`
joins the Pool's risk aggregate (health factor, borrowing power) with every
non-empty supplied/borrowed position.

Units, in the SDK-wide convention (bigint raw units everywhere):

- **Rates and indexes are ray (1e27).** Convert a rate for display with
  `lendRayRateToApy(r.liquidityRateRay)` — the per-second-compounded APY
  fraction Aave UIs show.
- **`healthFactor` is a wad (1e18).** Below `1e18` the position is liquidatable;
  a debt-free account reports `maxUint256`.
- **`*Base` aggregates** (`totalCollateralBase`, `availableBorrowsBase`, reserve
  prices) are denominated in the oracle base currency — USD with 8 decimals on
  this deployment (`baseCurrencyDecimals` rides along).
- **`borrowCap` / `supplyCap` are whole tokens** (Aave convention), not raw
  units; `0` means uncapped.
- Balances (`aTokenBalance`, `variableDebt`, `totalSupplied`, …) are raw
  underlying units, accrued to the read's timestamp with Aave's own interest
  math (linear for supply, compounded for debt) — they match what the Pool
  would settle, not the last stored checkpoint.

## Writes

```ts
const lender = lend.createLender({ privateKey }); // or account / walletClient

await lender.supply(usdso, 1_000n * 10n ** 18n); // auto-approves the Pool
await lender.borrow(usdce, 500n * 10n ** 6n); // variable rate only
await lender.repay(usdce, maxUint256); // maxUint256 = full debt
await lender.withdraw(usdso, maxUint256); // maxUint256 = full balance
await lender.setUseAsCollateral(usdso, true);
```

Same doctrine as the trader: writes resolve once mined (with the receipt), gas
is a fixed generous ceiling, fees are the client's fixed EIP-1559 config, and
ERC-20 pulls auto-approve `maxUint256` once per (token, spender) with an
in-memory grant cache (`approve: false` opts out per call;
`clearApprovalCache()` resets). Borrowing is variable-rate only — stable
borrowing isn't surfaced.

Native SOMI has gateway-routed siblings so you never touch WSOMI yourself:
`supplyNative` / `withdrawNative` / `borrowNative` / `repayNative`.
Two of them need a one-time grant the SDK also handles automatically:
`withdrawNative` approves the gateway to pull your aWSOMI, and `borrowNative`
delegates borrowing power on the WSOMI variable-debt token
(`approveDelegation`). `repayNative` doesn't take `maxUint256` — overpay
slightly instead; the gateway refunds the excess.

## Risk notes

- A borrow that would push the health factor below 1 reverts; watch
  `getAccount(me).healthFactor` and size against `availableBorrowsBase`.
- Liquidation pays the liquidator `liquidationBonusBps` out of your collateral —
  keep headroom, especially against WSOMI's price.
- Reserve flags matter: `isFrozen` blocks new supplies/borrows, `isPaused`
  blocks everything; check them before sizing.
- The SDK talks to SomniaLend's contracts as deployed — protocol risk
  (upgrades, oracle, listing params) is SomniaLend's admin surface, not this
  SDK's. See their [risks page](https://docs.somnialend.finance/risks).
