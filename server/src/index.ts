import { buildApi } from "./api.js";
import { CHAIN_ID, DATABASE_URL, PORT } from "./config.js";
import { openDb } from "./db.js";
import { readHeatmap, startEngine, type Engine } from "./engine.js";
import { notifyChat } from "./telegram.js";
import { startTelegram } from "./telegram.js";
import { attachWs } from "./ws.js";

const db = await openDb();
let engine: Engine | null = null;
const app = await buildApi(db, () => {
  if (!engine) throw new Error("engine not ready");
  return engine;
});

await app.listen({ port: PORT, host: "0.0.0.0" });
const hub = attachWs(app.server, () => [{ type: "feed_mode", mode: engine?.feedMode ?? "polling" }]);
const baseBroadcast = hub.broadcast.bind(hub);
hub.broadcast = (message: unknown) => {
  baseBroadcast(message);
  const msg = message as { type?: string; account?: string; symbol?: string; distancePct?: number; liq?: string; status?: string };
  if (msg.type === "account_risk" && msg.account && msg.symbol) {
    void notifyChat(
      db,
      msg.account,
      `Wipeout Map: ${msg.symbol} is ${msg.distancePct?.toFixed(1)}% from liquidation (${msg.liq ?? "n/a"}). Status ${msg.status}.`,
    );
  }
};
engine = startEngine(db, hub);
startTelegram(db, async (symbol) => (await readHeatmap(db, symbol))?.zones.map((zone) => zone.callout) ?? []);
console.log(`[wipeout] listening on ${PORT} chain ${CHAIN_ID} feed ${engine.feedMode} database=${DATABASE_URL ? "set" : "missing"}`);

let stopping = false;
async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  try {
    await app.close();
    engine?.stop();
    hub.close();
    await db.end();
    clearTimeout(force);
    process.exit(0);
  } catch (err) {
    console.error(`[wipeout] shutdown: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
process.once("SIGTERM", () => {
  void shutdown();
});
process.once("SIGINT", () => {
  void shutdown();
});
