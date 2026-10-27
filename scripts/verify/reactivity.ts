import WebSocket from "ws";
import { encodeEventTopics } from "viem";
import { liquidationEngineEventsAbi } from "@somnia-chain/markets-sdk";
import { WS_URL, createExchange } from "../../server/src/config.js";
import { discoverMarkets } from "../../server/src/discovery.js";

const WINDOW_MS = 25_000;

export async function runReactivity(): Promise<string> {
  const ex = createExchange();
  const markets = await discoverMarkets(ex);
  const market = markets.find((m) => m.symbol === "BTC") ?? markets[0];
  if (!market) return "no markets";
  const system = await ex.client.getPerpSystemConfig(market.marginBank);
  const topic = encodeEventTopics({ abi: liquidationEngineEventsAbi, eventName: "PositionLiquidated" })[0];
  return await new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let accepted = false;
    let delivered = false;
    let logs = 0;
    let watchId: string | null = null;
    let logsId: string | null = null;
    let watchError = "";
    const timer = setTimeout(() => finish(), WINDOW_MS);
    function finish() {
      clearTimeout(timer);
      ws.close();
      resolve(
        [
          `WebSocket ${WS_URL}`,
          `LiquidationEngine ${system.liquidationEngine}`,
          `somnia_watch subscription accepted: ${accepted ? "yes" : "no"}${watchError ? ` (${watchError})` : ""}`,
          `somnia_watch event delivered within ${WINDOW_MS / 1000}s: ${delivered ? "yes" : "no"}`,
          `eth_subscribe logs messages in the same window: ${logs}`,
          delivered
            ? "Reactivity delivery: YES. The server may prefer somnia_watch."
            : "Reactivity delivery: NO (not observed in the window). The server keeps the eth_getLogs poller.",
        ].join("\n"),
      );
    }
    ws.on("open", () => {
      ws.send(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_subscribe",
        params: ["somnia_watch", {
          address: system.liquidationEngine,
          topics: topic ? [topic] : [],
          eth_calls: [],
        }],
      }));
      ws.send(JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "eth_subscribe",
        params: ["logs", { address: system.liquidationEngine }],
      }));
    });
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          id?: number;
          result?: string;
          error?: { message?: string };
          method?: string;
          params?: { subscription?: string };
        };
        if (msg.id === 1 && msg.error) watchError = msg.error.message ?? "error";
        if (msg.id === 1 && typeof msg.result === "string") {
          accepted = true;
          watchId = msg.result;
        }
        if (msg.id === 2 && typeof msg.result === "string") logsId = msg.result;
        if (msg.method === "eth_subscription") {
          if (watchId && msg.params?.subscription === watchId) delivered = true;
          if (logsId && msg.params?.subscription === logsId) logs += 1;
        }
      } catch {
        /* ignore non-json frames */
      }
    });
    ws.on("error", () => finish());
  });
}
