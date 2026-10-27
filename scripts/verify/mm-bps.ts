import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { getAddress } from "viem";
import { perpLiquidationPrice } from "@somnia-chain/markets-sdk";
import { createExchange, repoRoot } from "../../server/src/config.js";
import { discoverMarkets } from "../../server/src/discovery.js";
import { liqMatches, liquidationPrice } from "../../server/src/liqmath.js";

export async function runMmBps(): Promise<string> {
  const ex = createExchange();
  const id = await ex.client.getViemClient().getChainId();
  if (id !== 50383) throw new Error(`chain ${id}`);
  const markets = await discoverMarkets(ex);
  const lines = [`chainId ${id}`, `markets ${markets.length}`, ""];
  lines.push("maintenanceMarginBps comes from client.getPerpRiskParams(pool), which reads getPerpPoolParameters. The indexed market row only has initialMarginBps.");
  lines.push("");
  for (const market of markets) {
    lines.push(`- ${market.symbol} im ${market.imBps} mm ${market.mmBps} max ${market.imBps > 0 ? 10000 / market.imBps : "?"}x`);
  }
  const eth = markets.find((m) => m.symbol === "ETH") ?? markets[0];
  if (!eth) return lines.join("\n");
  const long = await ex.client.getPerpSideHolders({ marginBank: eth.marginBank, pool: eth.pool, isLong: true });
  const sample = long.holders.slice(0, 40);
  const state = await ex.client.getPerpState(eth.pool);
  let compared = 0;
  let matched = 0;
  const fixtures: unknown[] = [];
  for (const account of sample) {
    if (compared >= 24) break;
    const ref = { marginBank: eth.marginBank, pool: eth.pool, account: getAddress(account) };
    const [position, health, chainLiq] = await Promise.all([
      ex.client.getPerpPosition(ref),
      ex.client.getAccountHealth(eth.marginBank, ref.account),
      ex.client.getLiquidationPrice(ref),
    ]);
    if (position.size === 0n) continue;
    const inputs = {
      equity: health.equity,
      mmReq: health.mmReq,
      size: position.size,
      markPrice: state.markPrice,
      maintenanceMarginBps: eth.mmBps,
      oneBase: eth.oneBase,
    };
    const local = liquidationPrice(inputs);
    const sdk = perpLiquidationPrice(inputs);
    const ok = liqMatches(local.kind === "finite" ? local.liqPrice : 0n, chainLiq, eth.tick) && local.liqPrice === (sdk ?? 0n);
    compared += 1;
    if (ok) matched += 1;
    fixtures.push({
      symbol: eth.symbol,
      account: ref.account,
      equity: health.equity.toString(),
      mmReq: health.mmReq.toString(),
      size: position.size.toString(),
      markPrice: state.markPrice.toString(),
      maintenanceMarginBps: eth.mmBps.toString(),
      oneBase: eth.oneBase.toString(),
      tick: eth.tick.toString(),
      chainLiq: chainLiq === null ? null : chainLiq.toString(),
    });
    if (!ok) {
      lines.push(`MISMATCH ${ref.account} local ${local.liqPrice} sdk ${sdk} chain ${chainLiq}`);
    }
  }
  lines.push("", `Compared ${compared} ${eth.symbol} positions. Matched ${matched}.`);
  const dir = resolve(repoRoot, "fixtures");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "positions.json"), JSON.stringify({ recordedAt: new Date().toISOString(), positions: fixtures }, null, 2));
  lines.push(`Wrote fixtures/positions.json (${fixtures.length}).`);
  return lines.join("\n");
}
