import { ORDER_TYPE } from "@somnia-chain/markets-sdk";

export async function runStopEntry(): Promise<string> {
  return [
    "Read from @somnia-chain/markets-sdk@0.32.1 dist/trade.d.ts.",
    "",
    `ORDER_TYPE runtime: LIMIT ${ORDER_TYPE.LIMIT}, FILL_OR_KILL ${ORDER_TYPE.FILL_OR_KILL}, MARKET/IOC ${ORDER_TYPE.MARKET}, POST_ONLY ${ORDER_TYPE.POST_ONLY}.`,
    "placePerpOrder.orderType is documented as 0 limit (default) or 2 market (IOC). The shared enum also has FillOrKill (1) and PostOnly (3).",
    "PlacePerpOrderParams has no reduceOnly field and no userData field. BatchOrderRequest (amend/spot) has userData. A reduce is a closing IOC sized to a fraction of the live position, re-read just before signing.",
    "",
    "placePerpStopOrder accepts intent: \"reduceOnly\" (default) or \"opening\".",
    "Opening is a stop-entry. The SDK comment says an opening leg cannot be paired, because a bracket that arms on the parent fill is not expressible.",
    "Linked SL/TP (the pair field) is for two reduce-only legs: same side, opposite trigger operators, GTE trigger above LTE trigger.",
    "",
    "Cascade fallback: the UI places the opening stop, keeps the required SL price, and asks for a second signature to place the reduce-only SL once the entry has filled.",
    "Fix-sheet Set stop uses reduce-only with an optional linked TP in one transaction.",
  ].join("\n");
}
