import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { repoRoot } from "../../server/src/config.js";
import { runBatch } from "./batch-speed.js";
import { runExtras } from "./extras.js";
import { runMmBps } from "./mm-bps.js";
import { runPlaceSamples } from "./place-samples.js";
import { runReactivity } from "./reactivity.js";
import { runStopEntry } from "./stop-entry.js";

const sections: string[] = ["# VERIFY", "", `Ran ${new Date().toISOString()}.`, ""];

async function section(title: string, fn: () => Promise<string>): Promise<void> {
  console.log(`\n== ${title} ==`);
  try {
    const body = await fn();
    sections.push(`## ${title}`, "", body, "");
    console.log(body);
  } catch (err) {
    const text = err instanceof Error ? err.stack ?? err.message : String(err);
    sections.push(`## ${title}`, "", "FAILED", "", "```", text, "```", "");
    console.error(text);
  }
}

await section("Maintenance margin and liquidation match", runMmBps);
await section("Stop orders and order types", runStopEntry);
await section("Penalty, faucet, linked wallets, indexer history", runExtras);
await section("somnia_watch delivery", runReactivity);
await section("Batched read speed", runBatch);
await section("Sample orders", runPlaceSamples);

const out = resolve(repoRoot, "docs/VERIFY.md");
mkdirSync(resolve(repoRoot, "docs"), { recursive: true });
writeFileSync(out, sections.join("\n"));
console.log(`\nWrote ${out}`);
process.exit(0);
