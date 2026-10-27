import type { LiquidationRow } from "../lib/api";
import { ago, pretty } from "../lib/pretty";

export function LiveFeed({
  rows,
  mode,
  feedOk,
  shockTx,
}: {
  rows: LiquidationRow[];
  mode: "reactivity" | "polling";
  feedOk: boolean;
  shockTx: string | null;
}) {
  const header = !feedOk ? "FEED DOWN" : mode === "reactivity" ? "LIVE · REACTIVITY" : "POLLING";
  return (
    <aside className={`rail ${!feedOk ? "down" : mode}`}>
      <h4><i />{header}</h4>
      {rows.length === 0 && <p className="quiet">No liquidations in the log yet.</p>}
      <ul>
        {rows.slice(0, 8).map((row) => (
          <li className={row.tx === shockTx ? "tape-row shock" : "tape-row"} key={`${row.tx}-${row.logIndex}`}>
            <b className={row.side === "long" ? "long" : "short"}>{(row.side ?? "—").toUpperCase()}</b>
            <span>{row.symbol ?? "—"} {pretty(row.size)} @ {pretty(row.price)}</span>
            <em>{row.ts ? ago(row.ts) : ""}</em>
          </li>
        ))}
      </ul>
    </aside>
  );
}
