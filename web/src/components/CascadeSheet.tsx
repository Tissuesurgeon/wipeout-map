import { useEffect, useRef, useState } from "react";
import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import type { Market, WipeZone } from "../lib/api";
import { cascadeEntry, cascadeFilled, placeCascadeStop, positionSize, stopProtectsEntry } from "../lib/orders";
import type { PendingStop } from "../lib/pending";
import { pretty, shortAddr } from "../lib/pretty";

export function CascadeSheet({
  zone,
  market,
  account,
  exchange,
  freeEquity,
  onClose,
  onPending,
  onCleared,
  pendingStop,
}: {
  zone: WipeZone;
  market: Market | undefined;
  account: string | null;
  exchange: SomniaMarkets | null;
  freeEquity: string;
  onClose: () => void;
  onPending: (pending: PendingStop) => void;
  onCleared: () => void;
  pendingStop: PendingStop | null;
}) {
  const isBid = zone.side === "short";
  const trigger = zone.side === "short" ? zone.priceLo : zone.priceHi;
  const [size, setSize] = useState("0.01");
  const [stop, setStop] = useState(pendingStop?.stop ?? "");
  const [note, setNote] = useState<string | null>(null);
  const [entryHash, setEntryHash] = useState<string | null>(pendingStop?.entryHash ?? null);
  const [stopHash, setStopHash] = useState<string | null>(null);
  const [pending, setPending] = useState(Boolean(pendingStop));
  const [busy, setBusy] = useState(false);
  const signing = useRef(false);
  const sizeBefore = useRef<bigint | null>(pendingStop?.sizeBefore ? BigInt(pendingStop.sizeBefore) : null);
  const quantity = useRef<bigint>(pendingStop?.quantity ? BigInt(pendingStop.quantity) : 0n);

  const equity = Number(freeEquity);
  const notional = Number(size) * Number(trigger);
  const capLev = Math.min(5, market?.maxLeverage ?? 5);
  const cap = Number.isFinite(equity) && equity > 0 ? Math.min(0.2 * equity, capLev * equity) : 0;
  const sideOk = stopProtectsEntry(isBid, Number(trigger), Number(stop));
  const tooBig = !(equity > 0) || notional > cap;
  const oneLot = market ? Number(market.lot) / Number(market.oneBase) : 0;
  const belowLot = !market || Number(size) < oneLot;
  const placeDisabled =
    !exchange ||
    !account ||
    !market ||
    !sideOk ||
    tooBig ||
    belowLot ||
    market.feedOk === false ||
    busy ||
    pending;

  useEffect(() => {
    if (!pending || !entryHash || stopHash || !exchange || !market || !account) return;
    let cancel = false;
    void (async () => {
      for (let i = 0; i < 45 && !cancel && !signing.current; i++) {
        try {
          const before = sizeBefore.current;
          const open = before !== null && quantity.current > 0n && await cascadeFilled(exchange, market, account, isBid, before, quantity.current);
          if (open) {
            await signStop();
            return;
          }
        } catch (err) {
          if (!cancel) setNote(err instanceof Error ? err.message : "Position read failed");
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    })();
    return () => {
      cancel = true;
    };
  }, [pending, entryHash, stopHash, exchange, market, account, isBid, stop]);

  async function signStop() {
    if (!exchange || !market || !account || signing.current || stopHash) return;
    signing.current = true;
    setBusy(true);
    setNote(null);
    try {
      const before = sizeBefore.current;
      if (before === null || quantity.current <= 0n || !(await cascadeFilled(exchange, market, account, isBid, before, quantity.current))) {
        setNote("Entry has not filled yet. The stop stays pending.");
        return;
      }
      const hash = await placeCascadeStop(exchange, market, account, isBid, stop);
      setStopHash(hash);
      setPending(false);
      onCleared();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Stop failed");
    } finally {
      signing.current = false;
      setBusy(false);
    }
  }

  async function place() {
    if (!exchange || !market || !account) return;
    setBusy(true);
    setNote(null);
    try {
      const before = await positionSize(exchange, market, account);
      sizeBefore.current = before;
      const placed = await cascadeEntry(exchange, market, account, {
        isBid,
        quantityHuman: size,
        triggerHuman: trigger,
        stopHuman: stop,
        sizeBefore: before.toString(),
      });
      quantity.current = BigInt(placed.quantity);
      setEntryHash(placed.hash);
      setPending(true);
      onPending({
        account,
        pool: market.pool,
        symbol: market.symbol,
        isBid,
        stop,
        sizeBefore: before.toString(),
        quantity: placed.quantity,
        entryHash: placed.hash,
      });
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  const reason = !exchange || !account
    ? "Connect wallet to sign."
    : !(equity > 0)
      ? "Connect a funded account so free equity can be read."
      : !sideOk
        ? (isBid ? "Stop-loss has to be below the trigger." : "Stop-loss has to be above the trigger.")
        : tooBig
          ? `Notional is above the cap (${pretty(cap)} USDso).`
          : belowLot
            ? "Size is below one lot."
            : null;

  return (
    <div className="sheet open">
      <div className="handle" aria-hidden="true" />
      <div className="sheet-head">
        <h2>{isBid ? "Long the squeeze" : "Short the break"}</h2>
        <button className="act" onClick={onClose}>Close</button>
      </div>
      <p style={{ color: "var(--silt)" }}>
        {zone.side} zone {pretty(zone.priceLo)} – {pretty(zone.priceHi)}, notional {pretty(zone.notionalUsd)} USDso, {zone.positionCount} positions.
        Entry trigger {pretty(trigger)}.
      </p>
      <div className="row">
        <label>Size <input value={size} onChange={(e) => setSize(e.target.value)} /></label>
        <label>Stop-loss <input value={stop} placeholder={isBid ? "below trigger" : "above trigger"} onChange={(e) => setStop(e.target.value)} /></label>
        <button className="act primary" disabled={placeDisabled} onClick={() => void place()}>Ride the cascade</button>
      </div>
      {pending && !stopHash && (
        <div className="row">
          <p className="warn">SL pending, sign now.</p>
          <button className="act primary" disabled={!exchange || busy} onClick={() => void signStop()}>Sign stop</button>
        </div>
      )}
      {reason && <p className="hint">{reason}</p>}
      <p style={{ color: "var(--silt)" }}>
        Free equity {exchange && equity > 0 ? pretty(equity) : "unknown"} USDso. Cap {exchange && equity > 0 ? pretty(cap) : "—"} USDso (20% of equity, and {capLev}×).
        Notional {Number.isFinite(notional) ? pretty(notional) : "—"}.
        {Math.abs(Number(stop) - Number(trigger)) / Number(trigger) > 0.03 && sideOk && " Stop is more than 3% from the trigger."}
      </p>
      {entryHash && <p className="ok" title={entryHash}>Entry {shortAddr(entryHash)}</p>}
      {stopHash && <p className="ok" title={stopHash}>Stop {shortAddr(stopHash)}</p>}
      {note && <p className="bad">{note}</p>}
    </div>
  );
}
