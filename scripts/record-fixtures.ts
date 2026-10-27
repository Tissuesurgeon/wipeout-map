import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAddress } from "viem";
import { createExchange, repoRoot } from "../server/src/config.js";
import { discoverMarkets } from "../server/src/discovery.js";

const ex = createExchange();
const markets = await discoverMarkets(ex);
const target = markets.find((m) => m.symbol === "ETH") ?? markets[0];
if (!target) throw new Error("no markets");
const [long, short, state] = await Promise.all([
  ex.client.getPerpSideHolders({ marginBank: target.marginBank, pool: target.pool, isLong: true }),
  ex.client.getPerpSideHolders({ marginBank: target.marginBank, pool: target.pool, isLong: false }),
  ex.client.getPerpState(target.pool),
]);
const accounts = [...long.holders.slice(0, 40), ...short.holders.slice(0, 15)];
const positions = [];
for (const account of accounts) {
  if (positions.length >= 50) break;
  const ref = { marginBank: target.marginBank, pool: target.pool, account: getAddress(account) };
  const [position, health, chainLiq] = await Promise.all([
    ex.client.getPerpPosition(ref),
    ex.client.getAccountHealth(target.marginBank, ref.account),
    ex.client.getLiquidationPrice(ref),
  ]);
  if (position.size === 0n) continue;
  positions.push({
    symbol: target.symbol,
    account: ref.account,
    equity: health.equity.toString(),
    mmReq: health.mmReq.toString(),
    size: position.size.toString(),
    markPrice: state.markPrice.toString(),
    maintenanceMarginBps: target.mmBps.toString(),
    oneBase: target.oneBase.toString(),
    tick: target.tick.toString(),
    chainLiq: chainLiq === null ? null : chainLiq.toString(),
  });
}
const dir = resolve(repoRoot, "fixtures");
mkdirSync(dir, { recursive: true });
const file = resolve(dir, "positions.json");
writeFileSync(file, JSON.stringify({ recordedAt: new Date().toISOString(), positions }, null, 2));
console.log(`wrote ${positions.length} positions to ${file}`);
process.exit(0);
