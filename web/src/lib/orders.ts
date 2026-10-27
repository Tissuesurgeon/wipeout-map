import { ORDER_TYPE, type SomniaMarkets } from "@somnia-chain/markets-sdk";
import { getAddress, parseUnits, type Address } from "viem";
import { api, type Market } from "./api";
import { sizeMovedEnough } from "./fill";
import { approveToken } from "./wallet";

function baseDecimals(oneBase: string): number {
  try {
    let value = BigInt(oneBase);
    let digits = 0;
    while (value > 1n && digits < 36) {
      value /= 10n;
      digits += 1;
    }
    return digits || 18;
  } catch {
    return 18;
  }
}

function snap(value: bigint, tick: bigint, dir: "up" | "down"): bigint {
  if (tick <= 0n) return value;
  if (dir === "down") return (value / tick) * tick;
  return ((value + tick - 1n) / tick) * tick;
}

const erc20AllowanceAbi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function record(tx: string, account: string, pool: string, kind: string, params: unknown, status = "submitted"): Promise<void> {
  await api.order({ tx, account, pool, kind, params, status });
}

export function stopProtectsEntry(isBid: boolean, trigger: number, stop: number): boolean {
  if (!(trigger > 0) || !Number.isFinite(stop) || !(stop > 0)) return false;
  return isBid ? stop < trigger : stop > trigger;
}

export async function reducePosition(
  ex: SomniaMarkets,
  market: Market,
  account: string,
  side: "long" | "short",
  sizeHuman: string,
  pct: 25 | 50,
): Promise<string> {
  const tick = BigInt(market.tick);
  const lot = BigInt(market.lot);
  const mark = parseUnits(market.mark ?? "0", market.quoteDecimals);
  const size = parseUnits(sizeHuman, baseDecimals(market.oneBase));
  const qty = snap((size * BigInt(pct)) / 100n, lot, "down");
  if (qty <= 0n) throw new Error("Size rounds below one lot");
  const price = side === "long"
    ? snap((mark * 9950n) / 10000n, tick, "down")
    : snap((mark * 10050n) / 10000n, tick, "up");
  const result = await ex.trader.placePerpOrder({
    pool: market.pool as `0x${string}`,
    isBid: side === "short",
    price,
    quantity: qty,
    orderType: ORDER_TYPE.MARKET,
  });
  await record(result.hash, account, market.pool, "fix_reduce", { pct, price: price.toString(), quantity: qty.toString() });
  return result.hash;
}

export async function setStop(
  ex: SomniaMarkets,
  market: Market,
  account: string,
  side: "long" | "short",
  liqHuman: string,
  withTp: boolean,
): Promise<string> {
  if (!market.stopRegistry) throw new Error("This market has no stop registry");
  const tick = BigInt(market.tick);
  const liq = parseUnits(liqHuman, market.quoteDecimals);
  const mark = parseUnits(market.mark ?? "0", market.quoteDecimals);
  const rawTrigger = side === "long" ? (liq * 103n) / 100n : (liq * 97n) / 100n;
  const trigger = snap(rawTrigger, tick, side === "long" ? "up" : "down");
  const tpRaw = side === "long" ? (mark * 103n) / 100n : (mark * 97n) / 100n;
  const tp = snap(tpRaw, tick, side === "long" ? "up" : "down");
  const isBid = side === "short";
  const result = await ex.trader.placePerpStopOrder({
    registry: market.stopRegistry as `0x${string}`,
    pool: market.pool as `0x${string}`,
    isBid,
    quantity: 0n,
    triggerPrice: trigger,
    triggerOperator: side === "long" ? 1 : 0,
    stopOrderType: 1,
    intent: "reduceOnly",
    pair: withTp
      ? {
          isBid,
          quantity: 0n,
          triggerPrice: tp,
          triggerOperator: side === "long" ? 0 : 1,
          stopOrderType: 1,
        }
      : undefined,
  });
  await record(result.hash, account, market.pool, "fix_stop", { trigger: trigger.toString(), tp: withTp });
  return result.hash;
}

export async function addMargin(
  ex: SomniaMarkets,
  market: Market,
  account: string,
  amountHuman: string,
): Promise<{ hash: string; approveHash: string | null }> {
  const amount = parseUnits(amountHuman, market.quoteDecimals);
  const marginBank = market.marginBank as Address;
  const system = await ex.client.getPerpSystemConfig(marginBank);
  const collateral = getAddress(system.collateralToken);
  const allowance = await ex.client.getViemClient().readContract({
    address: collateral,
    abi: erc20AllowanceAbi,
    functionName: "allowance",
    args: [getAddress(account), marginBank],
  });
  let approveHash: string | null = null;
  if (allowance < amount) {
    approveHash = await approveToken(collateral, marginBank, amount);
    await ex.client.getViemClient().waitForTransactionReceipt({ hash: approveHash as `0x${string}` });
    await record(approveHash, account, market.pool, "approve_margin", { amount: amount.toString(), token: collateral });
  }
  const result = await ex.trader.depositMargin({
    marginBank,
    amount,
    collateral,
    autoApprove: true,
  });
  await record(result.hash, account, market.pool, "add_margin", { amount: amount.toString(), approveHash });
  return { hash: result.hash, approveHash };
}

export async function cascadeEntry(
  ex: SomniaMarkets,
  market: Market,
  account: string,
  input: {
    isBid: boolean;
    quantityHuman: string;
    triggerHuman: string;
    stopHuman: string;
    sizeBefore: string;
  },
): Promise<{ hash: string; quantity: string }> {
  if (!market.stopRegistry) throw new Error("This market has no stop registry");
  const triggerNum = Number(input.triggerHuman);
  const stopNum = Number(input.stopHuman);
  if (!stopProtectsEntry(input.isBid, triggerNum, stopNum)) {
    throw new Error(input.isBid ? "Long stop-loss must sit below the entry trigger" : "Short stop-loss must sit above the entry trigger");
  }
  const tick = BigInt(market.tick);
  const lot = BigInt(market.lot);
  const qty = snap(parseUnits(input.quantityHuman, baseDecimals(market.oneBase)), lot, "down");
  if (qty <= 0n) throw new Error("Size rounds below one lot");
  const trigger = snap(parseUnits(input.triggerHuman, market.quoteDecimals), tick, input.isBid ? "up" : "down");
  const result = await ex.trader.placePerpStopOrder({
    registry: market.stopRegistry as `0x${string}`,
    pool: market.pool as `0x${string}`,
    isBid: input.isBid,
    quantity: qty,
    triggerPrice: trigger,
    triggerOperator: input.isBid ? 0 : 1,
    stopOrderType: 1,
    intent: "opening",
  });
  if (result.receipt.status !== "success") throw new Error("Opening stop reverted");
  const ordered = qty.toString();
  await record(result.hash, account, market.pool, "cascade_entry", {
    trigger: trigger.toString(),
    quantity: qty.toString(),
    stop: input.stopHuman,
    isBid: input.isBid,
    sizeBefore: input.sizeBefore,
    symbol: market.symbol,
  }, "sl_pending");
  return { hash: result.hash, quantity: ordered };
}

export async function positionSize(ex: SomniaMarkets, market: Market, account: string): Promise<bigint> {
  const position = await ex.client.getPerpPosition({
    marginBank: market.marginBank as Address,
    pool: market.pool as Address,
    account: getAddress(account),
  });
  return position.size;
}

export async function cascadeFilled(
  ex: SomniaMarkets,
  market: Market,
  account: string,
  isBid: boolean,
  sizeBefore: bigint,
  quantity: bigint,
): Promise<boolean> {
  const size = await positionSize(ex, market, account);
  return sizeMovedEnough(size, sizeBefore, isBid, quantity, BigInt(market.lot));
}

export async function placeCascadeStop(
  ex: SomniaMarkets,
  market: Market,
  account: string,
  isBid: boolean,
  stopHuman: string,
): Promise<string> {
  if (!market.stopRegistry) throw new Error("This market has no stop registry");
  const tick = BigInt(market.tick);
  const side = isBid ? "long" : "short";
  const trigger = snap(parseUnits(stopHuman, market.quoteDecimals), tick, side === "long" ? "down" : "up");
  const result = await ex.trader.placePerpStopOrder({
    registry: market.stopRegistry as Address,
    pool: market.pool as Address,
    isBid: side === "short",
    quantity: 0n,
    triggerPrice: trigger,
    triggerOperator: side === "long" ? 1 : 0,
    stopOrderType: 1,
    intent: "reduceOnly",
  });
  if (result.receipt.status !== "success") throw new Error("Reduce-only stop reverted");
  await record(result.hash, account, market.pool, "cascade_stop", { trigger: trigger.toString() });
  return result.hash;
}
