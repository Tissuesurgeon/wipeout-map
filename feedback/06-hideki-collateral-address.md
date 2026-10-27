# Hideki address-book collateral is not the perp quote token

`SOMNIA_HIDEKI_TESTNET_ADDRESSES.collateral` (`0x9E9492cC533E8696A3b6afC7df730800DF75148f`) reports 6 decimals. `MarginBank.getSystemConfig` on the live bank names a different collateral, and perp marks are 18-decimal prices. Passing the address-book token into `readPerpMarketFromChain` stored `quoteDecimals: 6` and the map printed marks as ~1e16 times too large.

Discovery now takes `collateralToken` from `getPerpSystemConfig` and reads that token's `decimals()`. The address-book field is not used as the quote.
