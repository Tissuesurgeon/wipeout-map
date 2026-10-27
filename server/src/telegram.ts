import { randomBytes } from "node:crypto";
import { Bot } from "grammy";
import { isAddress } from "viem";
import type { Db } from "./db.js";
import { many } from "./db.js";
import { errText } from "./format.js";

export function startTelegram(db: Db, callouts: (symbol: string) => Promise<string[]>): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("[telegram] TELEGRAM_BOT_TOKEN empty, bot off");
    return;
  }
  const bot = new Bot(token);
  bot.command("watch", async (ctx) => {
    const parts = (ctx.message?.text ?? "").split(/\s+/);
    const address = parts[1];
    const threshold = Number(parts[2] ?? 15);
    if (!address || !isAddress(address)) {
      await ctx.reply("Usage: /watch 0x… [thresholdPct]");
      return;
    }
    const chatId = String(ctx.chat.id);
    const code = randomBytes(4).toString("hex");
    await db.query(
      "INSERT INTO watch_codes (code, chat_id, expires_at, used, attempts) VALUES ($1, $2, $3, 0, 0)",
      [code, chatId, Date.now() + 10 * 60_000],
    );
    await db.query(
      `INSERT INTO alerts (chat_id, account, threshold_pct, last_sent_at)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (chat_id, account) DO UPDATE SET threshold_pct = EXCLUDED.threshold_pct`,
      [chatId, address, Number.isFinite(threshold) ? threshold : 15],
    );
    await ctx.reply(`Watching ${address} under ${threshold}%. One-time code ${code} expires in 10 minutes. /stop to remove.`);
  });
  bot.command("zones", async (ctx) => {
    const symbol = (ctx.message?.text ?? "").split(/\s+/)[1] ?? "BTC";
    const lines = await callouts(symbol);
    await ctx.reply(lines.length > 0 ? lines.join("\n") : "No dominant wipeout zone: at-risk notional is spread out");
  });
  bot.command("stop", async (ctx) => {
    const address = (ctx.message?.text ?? "").split(/\s+/)[1];
    if (address && isAddress(address)) {
      await db.query("DELETE FROM alerts WHERE chat_id = $1 AND lower(account) = lower($2)", [String(ctx.chat.id), address]);
      await ctx.reply(`Stopped ${address}.`);
      return;
    }
    await db.query("DELETE FROM alerts WHERE chat_id = $1", [String(ctx.chat.id)]);
    await ctx.reply("Stopped every watch in this chat.");
  });
  bot.catch((err) => console.warn(`[telegram] ${errText(err)}`));
  void bot.start({
    onStart: () => console.log("[telegram] polling"),
  });
}

export async function notifyChat(db: Db, account: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const chats = await many<{ chat_id: string; last_sent_at: number }>(
    db,
    "SELECT chat_id, last_sent_at FROM alerts WHERE lower(account) = lower($1)",
    [account],
  );
  const bot = new Bot(token);
  for (const chat of chats) {
    if (Date.now() - chat.last_sent_at < 10 * 60_000) continue;
    try {
      await bot.api.sendMessage(chat.chat_id, text);
      await db.query(
        "UPDATE alerts SET last_sent_at = $1 WHERE chat_id = $2 AND lower(account) = lower($3)",
        [Date.now(), chat.chat_id, account],
      );
    } catch (err) {
      console.warn(`[telegram] send: ${errText(err)}`);
    }
  }
}
