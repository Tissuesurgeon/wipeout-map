import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import { repoRoot } from "../../server/src/config.js";

export async function runPlaceSamples(): Promise<string> {
  const key = process.env.TEST_PRIVATE_KEY;
  if (!key) {
    return [
      "No TEST_PRIVATE_KEY in the environment.",
      "place-samples.ts refuses to invent a key or a mint. The server never reads this variable.",
      "Three Hideki tx hashes were not produced.",
      "To record them: put a gitignored key in .env as TEST_PRIVATE_KEY (with a 0x prefix), fund it with Hideki STT and USDso, then run `pnpm verify` again.",
      "The order builders the script would call are trader.placePerpOrder (reduce-only sized IOC), trader.placePerpStopOrder (reduce-only pair SL/TP), and trader.depositMargin.",
    ].join("\n");
  }
  const account = privateKeyToAccount(key as `0x${string}`);
  const note = resolve(repoRoot, ".env");
  return [
    `Key present for ${account.address}. File exists: ${existsSync(note)}.`,
    "Automatic placement is not sent from this pass unless WIPEOUT_SEND_SAMPLES=1, so a verify run cannot spend testnet funds by surprise.",
    process.env.WIPEOUT_SEND_SAMPLES === "1"
      ? "WIPEOUT_SEND_SAMPLES=1 was set, but the sender is intentionally unimplemented until a Hideki USDso mint is confirmed in extras. No tx was sent."
      : "WIPEOUT_SEND_SAMPLES is unset. No tx was sent.",
  ].join("\n");
}
