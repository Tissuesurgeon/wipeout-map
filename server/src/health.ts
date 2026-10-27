import type { Address, PublicClient } from "viem";
import { getAddress } from "viem";
import { marginBankHealthAbi } from "./abi.js";
import { MULTICALL_CHUNK, MULTICALL_CONCURRENCY } from "./config.js";
import type { HolderRef, MarketInfo } from "./discovery.js";
import { chunks, mapPool, withBackoff } from "./format.js";

export type HealthRow = {
  account: Address;
  marginBank: Address;
  equity: bigint;
  imReq: bigint;
  mmReq: bigint;
  cmReq: bigint;
  status: string;
};

export type PositionRow = {
  pool: Address;
  account: Address;
  size: bigint;
  entry: bigint;
};

function statusOf(equity: bigint, imReq: bigint, mmReq: bigint, cmReq: bigint): string {
  if (equity >= imReq) return "Healthy";
  if (equity >= mmReq) return "MarginCall";
  if (equity >= cmReq) return "PartialLiquidation";
  return "CloseOut";
}

function readPositionResult(result: unknown): { size: bigint; avgEntryPrice: bigint } | null {
  if (!result || typeof result !== "object") return null;
  if ("size" in result && "avgEntryPrice" in result) {
    const row = result as { size: bigint; avgEntryPrice: bigint };
    return { size: row.size, avgEntryPrice: row.avgEntryPrice };
  }
  if ("position" in result) {
    return readPositionResult((result as { position: unknown }).position);
  }
  return null;
}

function readHealthResult(result: unknown): { equity: bigint; imReq: bigint; mmReq: bigint; cmReq: bigint } {
  if (result && typeof result === "object" && "equity" in result) {
    return result as { equity: bigint; imReq: bigint; mmReq: bigint; cmReq: bigint };
  }
  const tuple = result as readonly bigint[];
  return {
    equity: tuple[0] ?? 0n,
    imReq: tuple[1] ?? 0n,
    mmReq: tuple[2] ?? 0n,
    cmReq: tuple[3] ?? 0n,
  };
}

export async function readHealth(
  client: PublicClient,
  marginBank: Address,
  accounts: readonly Address[],
): Promise<HealthRow[]> {
  const bank = getAddress(marginBank);
  const groups = chunks(accounts, MULTICALL_CHUNK);
  const batches = await mapPool(groups, MULTICALL_CONCURRENCY, async (group) =>
    withBackoff("health multicall", () =>
      client.multicall({
        allowFailure: true,
        contracts: group.map((account) => ({
          address: bank,
          abi: marginBankHealthAbi,
          functionName: "getAccountHealth" as const,
          args: [account] as const,
        })),
      }),
    ),
  );
  const rows: HealthRow[] = [];
  groups.forEach((group, groupIndex) => {
    const batch = batches[groupIndex] ?? [];
    group.forEach((account, i) => {
      const item = batch[i];
      if (!item || item.status !== "success") return;
      const { equity, imReq, mmReq, cmReq } = readHealthResult(item.result);
      rows.push({
        account,
        marginBank: bank,
        equity,
        imReq,
        mmReq,
        cmReq,
        status: statusOf(equity, imReq, mmReq, cmReq),
      });
    });
  });
  return rows;
}

export async function readPositions(
  client: PublicClient,
  marginBank: Address,
  holders: readonly HolderRef[],
): Promise<PositionRow[]> {
  const bank = getAddress(marginBank);
  const mine = holders.filter((h) => getAddress(h.pool) && getAddress(marginBank) === bank);
  const groups = chunks(mine, MULTICALL_CHUNK);
  const batches = await mapPool(groups, MULTICALL_CONCURRENCY, async (group) =>
    withBackoff("position multicall", () =>
      client.multicall({
        allowFailure: true,
        contracts: group.map((holder) => ({
          address: bank,
          abi: marginBankHealthAbi,
          functionName: "getPosition" as const,
          args: [holder.account, holder.pool] as const,
        })),
      }),
    ),
  );
  const rows: PositionRow[] = [];
  groups.forEach((group, groupIndex) => {
    const batch = batches[groupIndex] ?? [];
    group.forEach((holder, i) => {
      const item = batch[i];
      if (!item || item.status !== "success") return;
      const position = readPositionResult(item.result);
      if (!position || position.size === 0n) return;
      rows.push({
        pool: holder.pool,
        account: holder.account,
        size: position.size,
        entry: position.avgEntryPrice,
      });
    });
  });
  return rows;
}

export function groupByBank(markets: readonly MarketInfo[]): Map<Address, MarketInfo[]> {
  const map = new Map<Address, MarketInfo[]>();
  for (const market of markets) {
    const list = map.get(market.marginBank) ?? [];
    list.push(market);
    map.set(market.marginBank, list);
  }
  return map;
}
