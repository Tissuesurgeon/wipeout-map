/**
 * Optional demo positions. Refuses to run unless a market is thin AND
 * WIPEOUT_SEED_DEMOS=1. Keys, if any, stay in .env and are never logged.
 */
import { createExchange } from "../server/src/config.js";
import { discoverMarkets, sweepHolders } from "../server/src/discovery.js";

const ex = createExchange();
const markets = await discoverMarkets(ex);
const sweep = await sweepHolders(ex, markets);
const counts = new Map<string, number>();
for (const holder of sweep.holders) {
  const market = markets.find((m) => m.pool === holder.pool);
  if (!market) continue;
  counts.set(market.symbol, (counts.get(market.symbol) ?? 0) + 1);
}
const thin = [...counts.entries()].filter(([, n]) => n < 30);
console.log("position counts", Object.fromEntries(counts));
if (thin.length === 0) {
  console.log("No market is under 30 positions. Demo bots stay off.");
  process.exit(0);
}
console.log("Thin markets:", thin.map(([s, n]) => `${s}=${n}`).join(", "));
if (process.env.WIPEOUT_SEED_DEMOS !== "1") {
  console.log("Set WIPEOUT_SEED_DEMOS=1 to seed. This process will not create positions otherwise.");
  process.exit(0);
}
console.log("Seeding is not automated: open the positions from the UI and flag is_demo_bot in SQLite. No key was read.");
process.exit(0);
