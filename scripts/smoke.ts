import { getAddress } from "viem";
import { createExchange } from "../server/src/config.js";
import { discoverMarkets } from "../server/src/discovery.js";
import { liqMatches, liquidationPrice } from "../server/src/liqmath.js";

const ex = createExchange();
const id = await ex.client.getViemClient().getChainId();
if (id !== 50383) throw new Error(`expected chain 50383, got ${id}`);
const markets = await discoverMarkets(ex);
if (markets.length !== 21) {
  console.warn(`expected 21 markets, found ${markets.length}`);
}
const eth = markets.find((m) => m.symbol === "ETH") ?? markets[0];
if (!eth) throw new Error("no markets");
const t0 = Date.now();
const holders = await ex.client.getPerpSideHolders({
  marginBank: eth.marginBank,
  pool: eth.pool,
  isLong: true,
});
const sweepMs = Date.now() - t0;
const state = await ex.client.getPerpState(eth.pool);
let matched = 0;
let compared = 0;
for (const account of holders.holders.slice(0, 10)) {
  const ref = { marginBank: eth.marginBank, pool: eth.pool, account: getAddress(account) };
  const [position, health, chainLiq] = await Promise.all([
    ex.client.getPerpPosition(ref),
    ex.client.getAccountHealth(eth.marginBank, ref.account),
    ex.client.getLiquidationPrice(ref),
  ]);
  if (position.size === 0n) continue;
  const local = liquidationPrice({
    equity: health.equity,
    mmReq: health.mmReq,
    size: position.size,
    markPrice: state.markPrice,
    maintenanceMarginBps: eth.mmBps,
    oneBase: eth.oneBase,
  });
  compared += 1;
  if (liqMatches(local.kind === "finite" ? local.liqPrice : 0n, chainLiq, eth.tick)) matched += 1;
}
console.log(JSON.stringify({
  chainId: id,
  markets: markets.length,
  symbols: markets.map((m) => m.symbol),
  sample: eth.symbol,
  holders: holders.holders.length,
  asOfBlock: holders.asOfBlock.toString(),
  sweepMs,
  compared,
  matched,
}, null, 2));
if (compared === 0 || matched === 0) {
  throw new Error(`liq match ${matched}/${compared}`);
}
if (markets.length !== 21) process.exitCode = 1;
process.exit(process.exitCode ?? 0);
