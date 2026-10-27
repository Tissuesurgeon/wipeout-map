import type { Address } from "viem";
import { getAddress } from "viem";
import type { PerpMarket, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { isPerpMarket, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { erc20ProbeAbi } from "./abi.js";
import { MULTICALL_CHUNK, MULTICALL_CONCURRENCY } from "./config.js";
import { chunks, errText, isTimeout, mapPool, withBackoff } from "./format.js";

export type MarketInfo = {
  pool: Address;
  symbol: string;
  marginBank: Address;
  stopRegistry: Address | null;
  quoteToken: Address;
  tick: bigint;
  lot: bigint;
  minQty: bigint;
  imBps: number;
  mmBps: bigint;
  oneBase: bigint;
  quoteDecimals: number;
};

export type HolderRef = {
  pool: Address;
  account: Address;
  isLong: boolean;
};

export function preferredRank(symbol: string): number {
  const index = PREFERRED.findIndex((name) => name.toLowerCase() === symbol.toLowerCase());
  return index === -1 ? PREFERRED.length : index;
}

const PREFERRED = [
  "BTC", "ETH", "SOL", "HYPE", "XRP", "DOGE", "BNB", "ADA", "SUI", "LINK",
  "AVAX", "XLM", "NEAR", "WLD", "TAO", "ZEC", "PUMP", "1000PEPE", "VVV", "LIT", "ZRO",
];

async function listedMarkets(ex: SomniaMarkets): Promise<PerpMarket[]> {
  try {
    const rows = await ex.client.listPerpMarkets();
    return rows.filter(isPerpMarket);
  } catch (err) {
    console.warn(`[wipeout] indexer market list failed (${errText(err).slice(0, 180)}). Reading pools from the factory.`);
  }
  const factoryAddress = SOMNIA_HIDEKI_TESTNET_ADDRESSES.perpPoolFactory;
  if (!factoryAddress) throw new Error("Hideki address book is missing perpPoolFactory");
  const factory = getAddress(factoryAddress);
  const statuses = await ex.client.listPerpPoolStatuses({ factory });
  const live = statuses.filter((status) => status.registered !== false);
  const bank = live.find((status) => status.marginBank)?.marginBank;
  if (!bank) throw new Error("No registered perp pool named a MarginBank");
  const system = await ex.client.getPerpSystemConfig(getAddress(bank));
  const collateral = getAddress(system.collateralToken);
  const client = ex.client.getViemClient();
  const decimals = await client.readContract({
    address: collateral,
    abi: erc20ProbeAbi,
    functionName: "decimals",
  });
  let collateralSymbol: string | null = null;
  try {
    collateralSymbol = await client.readContract({
      address: collateral,
      abi: erc20ProbeAbi,
      functionName: "symbol",
    });
  } catch {
    collateralSymbol = null;
  }
  const rows: PerpMarket[] = [];
  for (const status of live) {
    const row = await withBackoff(status.pool, () =>
      ex.client.readPerpMarketFromChain({
        status,
        collateralToken: collateral,
        collateralDecimals: Number(decimals),
        collateralSymbol,
        factory,
      }),
    );
    if (isPerpMarket(row)) rows.push(row);
  }
  return rows;
}

export async function discoverMarkets(ex: SomniaMarkets): Promise<MarketInfo[]> {
  const listed = await listedMarkets(ex);
  const markets: MarketInfo[] = [];
  for (const market of listed) {
    if (!isPerpMarket(market)) continue;
    const pool = getAddress(market.poolAddress);
    const risk = await withBackoff(market.baseSymbol ?? pool, () =>
      ex.client.getPerpRiskParams(pool),
    );
    const symbol = (market.baseSymbol ?? pool.slice(0, 8)).toUpperCase();
    markets.push({
      pool,
      symbol,
      marginBank: getAddress(market.marginBank),
      stopRegistry: market.stopRegistry ? getAddress(market.stopRegistry) : null,
      quoteToken: getAddress(market.quoteToken),
      tick: BigInt(market.tickSize),
      lot: BigInt(market.lotSize),
      minQty: BigInt(market.minQuantity),
      imBps: market.initialMarginBps,
      mmBps: risk.maintenanceMarginBps,
      oneBase: 10n ** BigInt(market.baseDecimals),
      quoteDecimals: market.quoteDecimals,
    });
  }
  markets.sort((a, b) => {
    const ai = PREFERRED.indexOf(a.symbol);
    const bi = PREFERRED.indexOf(b.symbol);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.symbol.localeCompare(b.symbol);
  });
  return markets;
}

export async function sweepHolders(
  ex: SomniaMarkets,
  markets: readonly MarketInfo[],
): Promise<{ holders: HolderRef[]; asOfBlock: bigint; ms: number }> {
  const started = Date.now();
  const holders: HolderRef[] = [];
  let asOfBlock = 0n;
  for (const market of markets) {
    const long = await readSide(ex, market, true, asOfBlock > 0n ? asOfBlock : undefined);
    if (asOfBlock === 0n) asOfBlock = long.asOfBlock;
    const short = await readSide(ex, market, false, asOfBlock);
    for (const account of long.holders) {
      holders.push({ pool: market.pool, account: getAddress(account), isLong: true });
    }
    for (const account of short.holders) {
      holders.push({ pool: market.pool, account: getAddress(account), isLong: false });
    }
    console.log(`[sweep] ${market.symbol} ${long.holders.length} long, ${short.holders.length} short`);
  }
  return { holders, asOfBlock, ms: Date.now() - started };
}

async function readSide(
  ex: SomniaMarkets,
  market: MarketInfo,
  isLong: boolean,
  blockNumber: bigint | undefined,
) {
  const label = `${market.symbol} ${isLong ? "long" : "short"}`;
  let pageSize = 200;
  let last: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await ex.client.getPerpSideHolders(
        { marginBank: market.marginBank, pool: market.pool, isLong },
        blockNumber === undefined ? { pageSize } : { pageSize, blockNumber },
      );
    } catch (err) {
      last = err;
      if (!isTimeout(err) || pageSize <= 50) break;
      pageSize = Math.max(50, Math.floor(pageSize / 2));
      console.warn(`[sweep] ${label} timed out, retrying ${pageSize} holders per call`);
    }
  }
  throw last instanceof Error ? last : new Error(`${label} failed`);
}

export function uniqueAccounts(holders: readonly HolderRef[]): Address[] {
  return [...new Set(holders.map((h) => h.account))];
}
