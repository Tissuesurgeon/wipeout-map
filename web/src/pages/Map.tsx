import { useEffect, useState } from "react";
import { api, type HeatBucket, type Heatmap as Heat, type WipeZone } from "../lib/api";
import { money, shortAddr } from "../lib/pretty";

const ZONE_COLOR = ["var(--z1)", "var(--z2)", "var(--z3)"];

function formatBlock(block: string): string {
  const amount = Number(block);
  return Number.isFinite(amount) ? amount.toLocaleString("en-US") : block;
}

function formatPx(value: string | number): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  const digits = Math.abs(amount) >= 100 ? 0 : Math.abs(amount) >= 1 ? 2 : 4;
  return amount.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function splitCallout(callout: string): { hero: string; sentence: string } {
  const space = callout.indexOf(" ");
  if (space < 0) return { hero: callout, sentence: "" };
  return { hero: callout.slice(0, space), sentence: callout.slice(space + 1) };
}

export function MapView({
  heat,
  block,
  shocks,
  onZone,
  onRisk,
}: {
  heat: Heat | null;
  block: string | null;
  shocks: { price: number; at: number }[];
  onZone: (zone: WipeZone) => void;
  onRisk: () => void;
}) {
  const zones = heat?.zones ?? [];
  const lead = zones[0];
  const parts = lead ? splitCallout(lead.callout) : null;
  const shocked = (zone: WipeZone) => shocks.some((shock) => {
    const age = performance.now() - shock.at;
    return age < 700 && shock.price >= Number(zone.priceLo) && shock.price <= Number(zone.priceHi);
  });

  return (
    <>
      <section className={`hero ${heat?.stale ? "stale" : ""} ${lead ? "fade" : ""}`} key={heat?.symbol ?? "loading"}>
        {!heat && (
          <div className="skeleton-card" aria-live="polite">
            <i />
            <i />
            <i />
            <p>Reading positions… block {block ?? "—"}</p>
          </div>
        )}
        {heat && !lead && heat.positionCount === 0 && (
          <p className="sent">No open positions on this market yet</p>
        )}
        {heat && !lead && heat.positionCount > 0 && (
          <p className="sent">No dominant wipeout: at-risk $ is spread out</p>
        )}
        {heat && lead && parts && (
          <>
            <div className="eyebrow">
              {heat.symbol} · BIGGEST WIPEOUT · <b className={lead.side}>{lead.side.toUpperCase()}S</b>
              <span className="asof">block {formatBlock(heat.asOfBlock)} · {heat.ageSec}s</span>
              {heat.stale && <em className="stale-pill">STALE</em>}
              {!heat.feedOk && <em className="stale-pill">FEED DOWN</em>}
            </div>
            <div className="big" key={parts.hero}>{parts.hero}</div>
            <p className="sent">{parts.sentence}</p>
            <div className="dist">
              <div>FROM PRICE<b>{lead.distancePct >= 0 ? "+" : ""}{lead.distancePct.toFixed(1)}%</b></div>
              <div>SHARE OF AT-RISK $<b>{Math.round(lead.share * 100)}%</b></div>
              <div>POSITIONS<b>{lead.positionCount}</b></div>
            </div>
            <div className="share" aria-hidden="true"><i style={{ width: `${Math.min(100, lead.share * 100)}%` }} /></div>
            <div className="cta">
              <button className="act primary" disabled={!heat.feedOk || heat.stale} onClick={() => onZone(lead)}>Ride the cascade</button>
              <button className="act" onClick={onRisk}>Check my risk</button>
            </div>
            <ul className="zone-list">
              {zones.map((zone) => (
                <li key={zone.rank}>
                  <button className={shocked(zone) ? "shock" : ""} onClick={() => onZone(zone)}>
                    <i style={{ background: ZONE_COLOR[zone.rank - 1] ?? "var(--z3)" }} />
                    <b>{money(zone.notionalUsd)}</b>
                    <span className={zone.side}>{zone.side}s</span>
                    <em>{zone.distancePct >= 0 ? "+" : ""}{zone.distancePct.toFixed(1)}% · {zone.positionCount} pos</em>
                    <span className="zr">{formatPx(zone.priceLo)}–{formatPx(zone.priceHi)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Details symbol={heat.symbol} />
          </>
        )}
      </section>
      <Ladder heat={heat} block={block} shocks={shocks} onZone={onZone} />
    </>
  );
}

function Ladder({
  heat,
  block,
  shocks,
  onZone,
}: {
  heat: Heat | null;
  block: string | null;
  shocks: { price: number; at: number }[];
  onZone: (zone: WipeZone) => void;
}) {
  const mark = Number(heat?.mark);
  const ready = heat && Number.isFinite(mark) && mark > 0;
  const lo = ready ? mark * 0.78 : 0;
  const hi = ready ? mark * 1.22 : 1;
  const yOf = (price: number) => ((hi - price) / (hi - lo)) * 100;
  const ticks = Array.from({ length: 7 }, (_, index) => hi - ((hi - lo) * index) / 6);
  const lead = heat?.zones[0];
  const guide = lead && ready ? guideBox(yOf, lead) : null;

  return (
    <section className={`ladder ${!heat ? "loading" : ""} ${heat && heat.zones.length === 0 ? "muted" : ""} ${heat ? "fade" : ""}`} key={heat?.symbol ?? "ladder"}>
      {!heat && <p className="scan-copy">Reading positions… block {block ?? "—"}</p>}
      {ready && ticks.map((price) => (
        <div className="tick" key={price} style={{ top: `${yOf(price)}%` }}>
          <span>{formatPx(price)}</span>
        </div>
      ))}
      {ready && heat.zones.map((zone) => {
        const top = yOf(Number(zone.priceHi));
        const bottom = yOf(Number(zone.priceLo));
        if (bottom < 0 || top > 100) return null;
        const clippedTop = Math.max(0, Math.min(100, top));
        const clippedBottom = Math.max(0, Math.min(100, bottom));
        const height = Math.max(clippedBottom - clippedTop, 2.4);
        const hot = shocks.some((shock) => performance.now() - shock.at < 700 && shock.price >= Number(zone.priceLo) && shock.price <= Number(zone.priceHi));
        const color = ZONE_COLOR[Math.min(2, zone.rank - 1)] ?? "var(--z3)";
        return (
          <button
            key={zone.rank}
            className={`band ${zone.rank === 1 ? "breathe" : ""} ${hot ? "shock" : ""}`}
            style={{ top: `${clippedTop}%`, height: `${height}%`, ["--c" as string]: color }}
            onClick={() => onZone(zone)}
          >
            <span className="bl"><b>#{zone.rank}</b> {money(zone.notionalUsd)} {zone.side.toUpperCase()}S</span>
            <span className="br">{formatPx(zone.priceLo)} – {formatPx(zone.priceHi)}</span>
          </button>
        );
      })}
      {guide && (
        <div className="arrow" style={{ top: `${guide.top}%`, height: `${guide.height}%` }}>
          <span>{guide.label}</span>
        </div>
      )}
      {ready && (
        <div className="markl" style={{ top: "50%" }}>
          <span>MARK {formatPx(mark)}</span>
        </div>
      )}
    </section>
  );
}

function guideBox(yOf: (price: number) => number, zone: WipeZone): { top: number; height: number; label: string } | null {
  const edgePrice = zone.distancePct >= 0 ? Number(zone.priceLo) : Number(zone.priceHi);
  const edge = Math.max(0, Math.min(100, yOf(edgePrice)));
  const mark = 50;
  const top = Math.min(mark, edge);
  const height = Math.max(Math.abs(mark - edge), 1);
  const arrow = zone.distancePct >= 0 ? "↑" : "↓";
  const signed = `${zone.distancePct >= 0 ? "+" : ""}${zone.distancePct.toFixed(1)}%`;
  return { top, height, label: `${arrow} ${signed} to wipeout` };
}

function Details({ symbol }: { symbol: string }) {
  const [open, setOpen] = useState(false);
  const [buckets, setBuckets] = useState<HeatBucket[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let stop = false;
    void api.heatmap(symbol, true).then((heat) => {
      if (!stop) setBuckets([...(heat.buckets ?? [])].sort((a, b) => Number(b.notional) - Number(a.notional)).slice(0, 12));
    }).catch(() => {
      if (!stop) setBuckets([]);
    });
    return () => { stop = true; };
  }, [open, symbol]);

  return (
    <div className="details">
      <button className="act" onClick={() => setOpen((current) => !current)}>{open ? "Hide details" : "Details"}</button>
      {open && (
        <ul>
          {(buckets ?? []).map((bucket) => {
            const top = bucket.topAccounts[0];
            return (
            <li key={`${bucket.side}-${bucket.priceLo}`}>
              <span className={bucket.side}>{bucket.side}</span>
              {formatPx(bucket.priceLo)}–{formatPx(bucket.priceHi)}
              <b>{money(bucket.notional)}</b>
              <em>{bucket.count}</em>
              {top && <em title={top.account}>{shortAddr(top.account)}</em>}
            </li>
            );
          })}
          {buckets && buckets.length === 0 && <li>No buckets in this window.</li>}
        </ul>
      )}
    </div>
  );
}
