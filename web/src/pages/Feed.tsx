import type { LiquidationRow } from "../lib/api";
import { ago, pretty, shortAddr } from "../lib/pretty";

export function Feed({ rows, shockTx }: { rows: LiquidationRow[]; shockTx?: string | null }) {
  return (
    <section className="feed-page">
      <h2>Liquidations</h2>
      {rows.length === 0 && <p className="quiet">The tape is quiet.</p>}
      {rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Market</th>
              <th>Side</th>
              <th>Size</th>
              <th>Price</th>
              <th>Predicted</th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.tx}-${row.logIndex}`} className={row.tx === shockTx ? "shock" : ""}>
                <td>{row.ts ? ago(row.ts) : "—"}</td>
                <td>{row.symbol ?? "—"}</td>
                <td className={row.side === "long" ? "long" : "short"}>{(row.side ?? "—").toUpperCase()}</td>
                <td>{pretty(row.size)}</td>
                <td>{pretty(row.price)}</td>
                <td>{row.predictedLiq && !row.predictedNa ? <span className={`chip ${row.hit ? "hit" : "miss"}`}>{row.hit ? "hit" : "miss"}</span> : ""}</td>
                <td title={row.account ?? ""}>{shortAddr(row.account)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
