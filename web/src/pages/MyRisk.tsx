import { DangerMeter } from "../components/DangerMeter";
import type { AccountView, PositionCard } from "../lib/api";
import type { PendingStop } from "../lib/pending";
import { pretty } from "../lib/pretty";

export function MyRisk({
  addressInput,
  setAddressInput,
  account,
  onLoad,
  onFix,
  canSign,
  pendingStop,
}: {
  addressInput: string;
  setAddressInput: (value: string) => void;
  account: AccountView | null;
  onLoad: () => void;
  onFix: (position: PositionCard) => void;
  canSign: boolean;
  pendingStop: PendingStop | null;
}) {
  return (
    <section className="risk">
      <h2>My risk</h2>
      <form className="lookup" onSubmit={(event) => { event.preventDefault(); onLoad(); }}>
        <input value={addressInput} onChange={(e) => setAddressInput(e.target.value)} placeholder="0x…" aria-label="Address" />
        <button className="act" type="submit">Look up</button>
      </form>
      {!account && <p className="sent">Paste an address or connect a wallet.</p>}
      {account && (
        <dl className="stats">
          <div><dt>Equity</dt><dd>{pretty(account.equity)}</dd></div>
          <div><dt>Maintenance</dt><dd>{pretty(account.mmReq)}</dd></div>
          <div><dt>Ratio</dt><dd>{account.marginRatio?.toFixed(2) ?? "—"}</dd></div>
          <div><dt>Block</dt><dd>{account.asOfBlock ?? "—"} · {account.ageSec ?? "—"}s{account.stale ? " · stale" : ""}</dd></div>
        </dl>
      )}
      {account?.cross && <p className="quiet">Cross margin. Each price assumes only that market moves.</p>}
      {account?.positions.map((position) => (
        <article className="pos-card" key={position.pool}>
          <header>
            <span className="eyebrow">{position.symbol} · <b className={position.side}>{position.side.toUpperCase()}</b></span>
            <span className={`pill ${position.status.toLowerCase()}`}>{position.status}</span>
          </header>
          <div className="pos-body">
            <DangerMeter status={position.status} distance={position.distancePct} />
            <div>
              <div className="liq-hero">{position.liq ? pretty(position.liq) : "Unreachable"}</div>
              <div className="quiet">{position.liqLabel}</div>
              <div className="quiet">size {pretty(position.size)} · entry {pretty(position.entry)} · mark {pretty(position.mark)}</div>
              {pendingStop?.pool === position.pool && <div className="warn">Stop-loss is still unsigned for this position.</div>}
            </div>
          </div>
          <button className="act primary" onClick={() => onFix(position)} disabled={!canSign || !position.feedOk}>Fix</button>
        </article>
      ))}
      {!canSign && account && account.positions.length > 0 && <p className="hint">Connect wallet to sign.</p>}
      {account && account.positions.length === 0 && <p className="quiet">No positions for this address.</p>}
    </section>
  );
}
