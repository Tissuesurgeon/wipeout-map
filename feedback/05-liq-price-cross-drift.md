# Local liquidation price can sit more than one tick off `getLiquidationPrice`

Day-1 compare on ETH (tick `0.01`, mm 250 bps): 24 live longs, local `perpLiquidationPrice` equal to the SDK function on every row, and within one tick of `getLiquidationPrice` on 18. The other 6 were 8 to 68 ticks lower on chain (about $0.08 to $0.68 on prices from roughly $240 to $890).

The pure function uses the account's current equity and maintenance requirement and assumes only this market's mark moves. A cross-margin account's other positions change the requirement as this mark moves, so the contract's `getLiquidationPrice` is not that isolated number. Wipeout Map keeps the SDK function and labels every price "Liq price (if only this market moves)".
