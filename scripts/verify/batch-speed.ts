import { createExchange } from "../../server/src/config.js";
import { discoverMarkets, sweepHolders, uniqueAccounts } from "../../server/src/discovery.js";
import { readHealth } from "../../server/src/health.js";

export async function runBatch(): Promise<string> {
  const ex = createExchange();
  const client = ex.client.getViemClient();
  const markets = await discoverMarkets(ex);
  const sweep = await sweepHolders(ex, markets);
  const accounts = uniqueAccounts(sweep.holders);
  const byBank = new Map<string, { bank: typeof markets[number]["marginBank"]; accounts: typeof accounts }>();
  for (const market of markets) {
    const mine = sweep.holders.filter((h) => h.pool === market.pool).map((h) => h.account);
    const row = byBank.get(market.marginBank) ?? { bank: market.marginBank, accounts: [] };
    row.accounts.push(...mine);
    byBank.set(market.marginBank, row);
  }
  const started = Date.now();
  let healthRows = 0;
  for (const row of byBank.values()) {
    const unique = [...new Set(row.accounts)];
    const health = await readHealth(client, row.bank, unique);
    healthRows += health.length;
  }
  const fullMs = Date.now() - started;
  const sample = accounts[0];
  const bank = markets[0]?.marginBank;
  let incrementalMs = 0;
  if (sample && bank) {
    const t0 = Date.now();
    await readHealth(client, bank, [sample]);
    incrementalMs = Date.now() - t0;
  }
  return [
    `Holder sweep ${sweep.ms}ms, asOfBlock ${sweep.asOfBlock}, position rows ${sweep.holders.length}, unique accounts ${accounts.length}.`,
    `Multicall health rebuild ${fullMs}ms for ${healthRows} accounts.`,
    `Incremental one-account health ${incrementalMs}ms.`,
  ].join("\n");
}
