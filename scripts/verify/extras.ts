import { getAddress } from "viem";
import { createExchange } from "../../server/src/config.js";
import { discoverMarkets } from "../../server/src/discovery.js";
import { erc20ProbeAbi } from "../../server/src/abi.js";
import { errText } from "../../server/src/format.js";

export async function runExtras(): Promise<string> {
  const ex = createExchange();
  const client = ex.client.getViemClient();
  const markets = await discoverMarkets(ex);
  const market = markets[0];
  if (!market) return "no markets";
  const lines: string[] = [];
  const system = await ex.client.getPerpSystemConfig(market.marginBank);
  const engine = await ex.client.getLiquidationEngineConfig(system.liquidationEngine);
  lines.push(`LiquidationEngine ${engine.address}`);
  lines.push(`penaltyBps ${engine.penaltyBps} (${Number(engine.penaltyBps) / 100}%)`);
  lines.push(`minSpreadBps ${engine.minSpreadBps} maxSpreadBps ${engine.maxSpreadBps}`);
  lines.push(engine.penaltyBps <= 100n ? "Penalty is within 1%." : "Penalty is above 1%.");

  const quote = getAddress(market.quoteToken);
  lines.push(`Quote token ${quote} (${market.symbol} quote).`);
  try {
    await client.simulateContract({
      address: quote,
      abi: erc20ProbeAbi,
      functionName: "mint",
      args: ["0x0000000000000000000000000000000000000001", 1n],
      account: "0x0000000000000000000000000000000000000001",
    });
    lines.push("USDso mint(address,uint256) simulated without a revert. A public mint may exist. No transaction was sent.");
  } catch (err) {
    lines.push(`USDso mint simulation: ${errText(err).slice(0, 400)}`);
    lines.push("The Shannon faucet guide in the SDK docs mints a Shannon USDso address. It is not a Hideki faucet. No paper credit was invented.");
  }

  const payer = await ex.client.quotePerpFundingPayer(market.marginBank, "0x0000000000000000000000000000000000000001");
  lines.push(`quotePerpFundingPayer(zero-ish): ${JSON.stringify(payer)}`);
  lines.push("Linked wallets: SDK PerpMainFunding documents principal as borrowable by a child and withdrawableFromPrincipal is the constant 0n. Placement can pull a main's margin. Withdraw of that principal is not available to the child. This was read from dist/perp/linkedWallet.d.ts and one live payer quote, not from a linked-bot transaction.");

  try {
    const rows = await ex.client.listLiquidations({ kind: "PositionLiquidated", limit: 3 });
    lines.push(`Indexer listLiquidations(PositionLiquidated) returned ${rows.length} row(s). History backfill is available.`);
    if (rows[0]) lines.push(`Newest id ${rows[0].id} block ${rows[0].blockNumber}.`);
  } catch (err) {
    lines.push(`Indexer liquidation history failed: ${errText(err)}`);
  }
  return lines.join("\n");
}
