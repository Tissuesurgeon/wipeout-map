# VERIFY

Ran 2026-10-26T21:36:41.209Z.

## Maintenance margin and liquidation match

chainId 50383
markets 21

maintenanceMarginBps comes from client.getPerpRiskParams(pool), which reads getPerpPoolParameters. The indexed market row only has initialMarginBps.

- BTC im 500 mm 250 max 20x
- ETH im 500 mm 250 max 20x
- SOL im 500 mm 250 max 20x
- HYPE im 500 mm 250 max 20x
- XRP im 500 mm 250 max 20x
- DOGE im 1000 mm 500 max 10x
- BNB im 1000 mm 500 max 10x
- ADA im 1000 mm 500 max 10x
- SUI im 1000 mm 500 max 10x
- LINK im 1000 mm 500 max 10x
- AVAX im 1000 mm 500 max 10x
- XLM im 1000 mm 500 max 10x
- NEAR im 1000 mm 500 max 10x
- WLD im 2000 mm 1000 max 5x
- TAO im 2000 mm 1000 max 5x
- ZEC im 2000 mm 1000 max 5x
- PUMP im 2000 mm 1000 max 5x
- 1000PEPE im 2000 mm 1000 max 5x
- VVV im 2000 mm 1000 max 5x
- LIT im 2000 mm 1000 max 5x
- ZRO im 2000 mm 1000 max 5x
MISMATCH 0x72FcAe8Cf145820C2d5eBc656D8fd05fd235B9D7 local 243445130693444815129 sdk 243445130693444815129 chain 243362699173290315129
MISMATCH 0x650216bA459bb6d92E9146d1D4789b6F33C80BBa local 888020568475893185556 sdk 888020568475893185556 chain 887828225001253685556
MISMATCH 0x9720ce3069D0F2a0b593a22A37e9026465310a65 local 539176230925296948206 sdk 539176230925296948206 chain 538816648326257948206
MISMATCH 0x9b83A8450E7F72C76287443e54D97ed8281d63c1 local 438894248092799938291 sdk 438894248092799938291 chain 438212240495495938291
MISMATCH 0xBDCc20E665C107c51234260D649C038f2De8117B local 423684487873132984445 sdk 423684487873132984445 chain 423247415056928984445
MISMATCH 0x9625F480610a20F4Dc66BE02067d5445A4D18820 local 274967429503644026325 sdk 274967429503644026325 chain 274640121899399526325

Compared 24 ETH positions. Matched 18.
Wrote fixtures/positions.json (24).

## Stop orders and order types

Read from @somnia-chain/markets-sdk@0.32.1 dist/trade.d.ts.

ORDER_TYPE runtime: LIMIT 0, FILL_OR_KILL 1, MARKET/IOC 2, POST_ONLY 3.
placePerpOrder.orderType is documented as 0 limit (default) or 2 market (IOC). The shared enum also has FillOrKill (1) and PostOnly (3).
PlacePerpOrderParams has no reduceOnly field and no userData field. BatchOrderRequest (amend/spot) has userData. A reduce is a closing IOC sized to a fraction of the live position, re-read just before signing.

placePerpStopOrder accepts intent: "reduceOnly" (default) or "opening".
Opening is a stop-entry. The SDK comment says an opening leg cannot be paired, because a bracket that arms on the parent fill is not expressible.
Linked SL/TP (the pair field) is for two reduce-only legs: same side, opposite trigger operators, GTE trigger above LTE trigger.

Cascade fallback: the UI places the opening stop, keeps the required SL price, and asks for a second signature to place the reduce-only SL once the entry has filled.
Fix-sheet Set stop uses reduce-only with an optional linked TP in one transaction.

## Penalty, faucet, linked wallets, indexer history

LiquidationEngine 0xA66d3C24Ad4a389d863846905D8173e1017e9F4D
penaltyBps 100 (1%)
minSpreadBps 50 maxSpreadBps 500
Penalty is within 1%.
Quote token 0xed7993A74dAe1e6656B704A424DcD8711aAf4F72 (BTC quote).
USDso mint simulation: The contract function "mint" reverted.

Contract Call:
  address:   0xed7993A74dAe1e6656B704A424DcD8711aAf4F72
  function:  mint(address to, uint256 amount)
  args:          (0x0000000000000000000000000000000000000001, 1)
  sender:    0x0000000000000000000000000000000000000001

Docs: https://viem.sh/docs/contract/simulateContract
Details: execution reverted
Version: viem@2.57.11
The Shannon faucet guide in the SDK docs mints a Shannon USDso address. It is not a Hideki faucet. No paper credit was invented.
quotePerpFundingPayer(zero-ish): {"funded":false,"reason":"unlinked"}
Linked wallets: SDK PerpMainFunding documents principal as borrowable by a child and withdrawableFromPrincipal is the constant 0n. Placement can pull a main's margin. Withdraw of that principal is not available to the child. This was read from dist/perp/linkedWallet.d.ts and one live payer quote, not from a linked-bot transaction.
Indexer listLiquidations(PositionLiquidated) returned 3 row(s). History backfill is available.
Newest id 0x61a0efb9e96a402234026602e2d9ddd351a3905b564ba2251868bb5c2bee9931_36 block 33842034.

## somnia_watch delivery

WebSocket wss://api.hideki2.infra.testnet.somnia.network/ws
LiquidationEngine 0xA66d3C24Ad4a389d863846905D8173e1017e9F4D
somnia_watch subscription accepted: yes
somnia_watch event delivered within 25s: no
eth_subscribe logs messages in the same window: 0
Reactivity delivery: NO (not observed in the window). The server keeps the eth_getLogs poller.

## Batched read speed

Holder sweep 27813ms, asOfBlock 33985392, position rows 11223, unique accounts 7991.
Multicall health rebuild 18476ms for 7991 accounts.
Incremental one-account health 392ms.

## Sample orders

No TEST_PRIVATE_KEY in the environment.
place-samples.ts refuses to invent a key or a mint. The server never reads this variable.
Three Hideki tx hashes were not produced.
To record them: put a gitignored key in .env as TEST_PRIVATE_KEY (with a 0x prefix), fund it with Hideki STT and USDso, then run `pnpm verify` again.
The order builders the script would call are trader.placePerpOrder (reduce-only sized IOC), trader.placePerpStopOrder (reduce-only pair SL/TP), and trader.depositMargin.
