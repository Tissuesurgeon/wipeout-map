import { useState } from "react";
import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { addMargin, reducePosition, setStop } from "../lib/orders";
import type { Market, PositionCard } from "../lib/api";
import { pretty, shortAddr } from "../lib/pretty";

export function FixSheet({
  position,
  market,
  account,
  exchange,
  onClose,
}: {
  position: PositionCard;
  market: Market | undefined;
  account: string;
  exchange: SomniaMarkets | null;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("100");
  const [tp, setTp] = useState(true);
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const feedDown = !market || market.feedOk === false || position.feedOk === false;
  const disabled = !exchange || feedDown;

  async function run(label: string, fn: () => Promise<string | { hash: string; approveHash: string | null }>) {
    setBusy(true);
    setOutcome(null);
    try {
      const result = await fn();
      const hash = typeof result === "string" ? result : result.hash;
      const approve = typeof result === "string" ? null : result.approveHash;
      setOutcome({
        ok: true,
        text: approve ? `${label} succeeded. Approve ${shortAddr(approve)}. Deposit ${shortAddr(hash)}.` : `${label} succeeded. ${shortAddr(hash)}.`,
      });
    } catch (err) {
      setOutcome({ ok: false, text: `${label} failed. ${err instanceof Error ? err.message : "Order failed"}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet open">
      <div className="handle" aria-hidden="true" />
      <div className="sheet-head">
        <h2>Fix {position.symbol} {position.side}</h2>
        <button className="act" onClick={onClose}>Close</button>
      </div>
      <p style={{ color: "var(--silt)" }}>
        {position.liqLabel}: {position.liq ? pretty(position.liq) : "unreachable"}.
        Distance {position.distancePct != null ? `${pretty(position.distancePct)}%` : "—"}.
        {position.cross && " Cross margin: other markets are held still."}
      </p>
      <div className="row">
        <button className="act primary" disabled={disabled || busy || !position.liq} onClick={() => market && void run("Reduce 25%", () => reducePosition(exchange!, market, account, position.side, position.size, 25))}>Reduce 25%</button>
        <button className="act primary" disabled={disabled || busy || !position.liq} onClick={() => market && void run("Reduce 50%", () => reducePosition(exchange!, market, account, position.side, position.size, 50))}>Reduce 50%</button>
        <label className="warn"><input type="checkbox" checked={tp} onChange={(e) => setTp(e.target.checked)} /> linked TP</label>
        <button className="act" disabled={disabled || busy || !position.liq} onClick={() => market && position.liq && void run("Set stop", () => setStop(exchange!, market, account, position.side, position.liq!, tp))}>Set stop</button>
        <label>USDso <input value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="USDso to deposit" /></label>
        <button className="act" disabled={disabled || busy} onClick={() => market && void run("Add margin", () => addMargin(exchange!, market, account, amount))}>Add margin</button>
      </div>
      <p className="hint">Reduce is a closing IOC with 0.5% slippage. It does not use a reduce-only flag.</p>
      <p className="hint">If the USDso allowance is short, an approve prompt comes before the deposit.</p>
      {!exchange && <p className="hint">Connect wallet to sign.</p>}
      {outcome && <p className={outcome.ok ? "ok" : "bad"}>{outcome.text}</p>}
    </div>
  );
}
