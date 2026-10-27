import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  SomniaMarkets,
} from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, "../..");

loadEnv({ path: resolve(repoRoot, ".env") });

export const CHAIN_ID = 50383;
export const PORT = Number(process.env.PORT ?? 8787);
export const INDEXER_URL =
  process.env.INDEXER_URL ?? "https://hideki-dev.smk.somnia.host/v1/graphql";
export const RPC_URL =
  process.env.RPC_URL ?? hidekiTestnet.rpcUrls.default.http[0];
export const WS_URL =
  process.env.WS_URL ?? hidekiTestnet.rpcUrls.default.webSocket[0];
export const STALE_MS = 30_000;
export const MARK_INTERVAL_MS = 2_000;
export const SWEEP_INTERVAL_MS = 5 * 60_000;
export const NEAR_LIQ_INTERVAL_MS = 60_000;
export const NEAR_LIQ_PCT = 10;
export const MULTICALL_CHUNK = 40;
export const MULTICALL_CONCURRENCY = 2;

if (hidekiTestnet.id !== CHAIN_ID) {
  throw new Error(`hidekiTestnet.id ${hidekiTestnet.id} is not ${CHAIN_ID}`);
}

export function createExchange(): SomniaMarkets {
  return new SomniaMarkets({
    indexerUrl: INDEXER_URL,
    chain: hidekiTestnet,
    addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
    wsRpcUrl: WS_URL,
  });
}

function envValue(name: string): string {
  const value = process.env[name] ?? "";
  if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) return value.slice(1, -1);
  return value;
}

export const DATABASE_URL = envValue("DATABASE_URL");
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn("[wipeout] TELEGRAM_BOT_TOKEN is not set; alerts are off");
}
export const DIRECT_URL = envValue("DIRECT_URL") || DATABASE_URL;
export const DB_POOL_MAX = Number(process.env.DB_POOL_MAX ?? 5);
