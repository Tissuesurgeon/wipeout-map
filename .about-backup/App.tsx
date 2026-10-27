import { useEffect, useState } from "react";
import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { CascadeSheet } from "./components/CascadeSheet";
import { FixSheet } from "./components/FixSheet";
import { LiveFeed } from "./components/LiveFeed";
import { About } from "./pages/About";
import { Feed } from "./pages/Feed";
import { MapView } from "./pages/Map";
import { MyRisk } from "./pages/MyRisk";
import { api, openSocket, type AccountView, type Heatmap as Heat, type LiquidationRow, type Market, type PositionCard, type WipeZone } from "./lib/api";
import { clearPending, loadPending, savePending, type PendingStop } from "./lib/pending";
import { money, shortAddr } from "./lib/pretty";
import { connectWallet } from "./lib/wallet";

type Route = "map" | "risk" | "feed" | "about";
type Shock = { price: number; at: number };

export function App() {
  const [route, setRoute] = useState<Route>("map");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [symbol, setSymbol] = useState("BTC");
  const [heat, setHeat] = useState<Heat | null>(null);
  const [rows, setRows] = useState<LiquidationRow[]>([]);
  const [block, setBlock] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountView | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [exchange, setExchange] = useState<SomniaMarkets | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [fix, setFix] = useState<PositionCard | null>(null);
  const [zone, setZone] = useState<WipeZone | null>(null);
  const [pendingStop, setPendingStop] = useState<PendingStop | null>(() => loadPending());
  const [shocks, setShocks] = useState<Shock[]>([]);
  const [shockTx, setShockTx] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [feedMode, setFeedMode] = useState<"reactivity" | "polling">("polling");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const pull = async () => {
      try {
        const listed = await api.markets();
        if (stop) return;
        setMarkets(listed.markets);
        const first = listed.markets.find((m) => m.symbol === "BTC") ?? listed.markets[0];
        if (first) {
          setSymbol((current) => current || first.symbol);
          setBlock(first.asOfBlock);
        }
      } catch (err) {
        if (!stop) setError(err instanceof Error ? err.message : "markets failed");
      }
    };
    const health = async () => {
      try {
        const status = await api.health();
        if (stop) return;
        setReady(status.ready);
        if (status.feedMode) setFeedMode(status.feedMode);
        if (status.block && status.block !== "0") setBlock(status.block);
      } catch {
        /* health follows the API */
      }
    };
    void pull();
    void health();
    const timer = setInterval(() => { void pull(); void health(); }, 4000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let stop = false;
    const pull = async () => {
      try {
        const next = await api.heatmap(symbol);
        if (!stop) {
          setHeat(next);
          setBlock(next.asOfBlock);
        }
      } catch {
        if (!stop) setHeat(null);
      }
      try {
        const feed = await api.liquidations();
        if (!stop) setRows(feed.liquidations);
      } catch {
        /* feed can be empty */
      }
    };
    void pull();
    const timer = setInterval(() => void pull(), 2000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [symbol]);

  useEffect(() => {
    if (!wallet) return;
    void api.pendingStops(wallet).then((result) => {
      const row = result.orders[0];
      if (!row) return;
      const pending: PendingStop = {
        account: row.account,
        pool: row.pool,
        symbol: String(row.params.symbol ?? ""),
        isBid: Boolean(row.params.isBid),
        stop: String(row.params.stop ?? ""),
        sizeBefore: String(row.params.sizeBefore ?? "0"),
        quantity: String(row.params.quantity ?? ""),
        entryHash: row.tx,
      };
      savePending(pending);
      setPendingStop(pending);
    }).catch(() => undefined);
  }, [wallet]);

  useEffect(() => {
    const ws = openSocket((msg) => {
      if (msg.type === "mark" && msg.symbol === symbol && typeof msg.mark === "string") {
        setHeat((current) => current && current.symbol === symbol ? { ...current, mark: msg.mark as string, stale: false, ageSec: 0 } : current);
        setMarkets((current) => current.map((m) => m.symbol === msg.symbol ? { ...m, mark: String(msg.mark), feedOk: Boolean(msg.feedOk), stale: false, ageSec: 0 } : m));
        if (typeof msg.block === "string") setBlock(msg.block);
      }
      if ((msg.type === "zones" || msg.type === "bucket_update") && msg.symbol === symbol) {
        setHeat((current) => {
          const next = msg as unknown as Heat;
          if (!next.zones) return current;
          return { ...next, buckets: next.buckets ?? current?.buckets };
        });
        const lead = (msg.zones as WipeZone[] | undefined)?.[0];
        if (lead) {
          setMarkets((current) => current.map((m) => m.symbol === symbol ? { ...m, leadNotionalUsd: lead.notionalUsd, leadSide: lead.side } : m));
        }
      }
      if (msg.type === "feed_mode" && (msg.mode === "reactivity" || msg.mode === "polling")) {
        setFeedMode(msg.mode);
      }
      if (msg.type === "liquidation") {
        const row = msg as unknown as LiquidationRow;
        setRows((current) => [row, ...current].slice(0, 40));
        setShockTx(row.tx);
        const price = Number(row.price);
        if (Number.isFinite(price)) setShocks((current) => [...current, { price, at: performance.now() }].slice(-8));
      }
    });
    return () => ws.close();
  }, [symbol]);

  const market = markets.find((m) => m.symbol === symbol);
  const pills = [...markets].sort((a, b) => Number(b.leadNotionalUsd ?? -1) - Number(a.leadNotionalUsd ?? -1) || a.symbol.localeCompare(b.symbol));

  async function loadAccount(address: string) {
    setError(null);
    const view = await api.account(address);
    setAccount(view);
    setRoute("risk");
  }

  async function connect() {
    try {
      const connected = await connectWallet();
      setExchange(connected.exchange);
      setWallet(connected.address);
      setAddressInput(connected.address);
      await loadAccount(connected.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "wallet failed");
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">WIPEOUT<i>/</i>MAP</div>
        <div className="bar-end">
          <nav className="routes" aria-label="Pages">
            <button className={route === "map" ? "on" : ""} onClick={() => setRoute("map")}>Map</button>
            <button className={route === "risk" ? "on" : ""} onClick={() => setRoute("risk")}>My risk</button>
            <button className={route === "feed" ? "on" : ""} onClick={() => setRoute("feed")}>Tape</button>
            <button className={route === "about" ? "on" : ""} onClick={() => setRoute("about")}>About</button>
          </nav>
          <button className="connect" onClick={() => void connect()}>{wallet ? shortAddr(wallet) : "Connect wallet"}</button>
        </div>
      </header>
      <nav className="pills" aria-label="Markets">
        {pills.map((item) => (
          <button
            key={item.pool}
            className={item.symbol === symbol ? "on" : ""}
            onClick={() => { setSymbol(item.symbol); setZone(null); setRoute("map"); }}
          >
            <span>{item.symbol}</span>
            <em>{item.leadNotionalUsd ? money(item.leadNotionalUsd) : "—"}</em>
          </button>
        ))}
      </nav>
      {route === "about" ? <About /> : route === "feed" ? <Feed rows={rows} shockTx={shockTx} /> : (
        <main className={`stage ${route}`}>
          {route === "map" && (
            <MapView
              heat={ready || heat ? heat : null}
              block={block}
              shocks={shocks}
              onZone={(next) => { setZone(next); setFix(null); }}
              onRisk={() => setRoute("risk")}
            />
          )}
          {route === "risk" && (
            <MyRisk
              addressInput={addressInput}
              setAddressInput={setAddressInput}
              account={account}
              onLoad={async () => {
                try { await loadAccount(addressInput); } catch (err) { setError(err instanceof Error ? err.message : "lookup failed"); }
              }}
              onFix={(position) => { setFix(position); setZone(null); setSymbol(position.symbol); }}
              pendingStop={pendingStop}
              canSign={Boolean(wallet)}
            />
          )}
          {route === "map" && (
            <LiveFeed rows={rows} mode={feedMode} feedOk={market?.feedOk !== false} shockTx={shockTx} />
          )}
        </main>
      )}
      <nav className="tabbar" aria-label="Pages">
        <button className={route === "map" ? "on" : ""} onClick={() => setRoute("map")}>Map</button>
        <button className={route === "risk" ? "on" : ""} onClick={() => setRoute("risk")}>My risk</button>
        <button className={route === "feed" ? "on" : ""} onClick={() => setRoute("feed")}>Tape</button>
        <button className={route === "about" ? "on" : ""} onClick={() => setRoute("about")}>About</button>
      </nav>
      {fix && (
        <FixSheet position={fix} market={markets.find((m) => m.pool === fix.pool) ?? market} account={account?.account ?? wallet ?? ""} exchange={exchange} onClose={() => setFix(null)} />
      )}
      {pendingStop && (
        <div className="pending-banner">
          Stop-loss still needs a signature for {pendingStop.symbol}. It stays here until you sign it.
          <button className="act primary" onClick={() => {
            const listed = markets.find((item) => item.pool === pendingStop.pool);
            if (!listed) return;
            setSymbol(listed.symbol);
            setZone({
              rank: 1,
              side: pendingStop.isBid ? "short" : "long",
              priceLo: pendingStop.stop,
              priceHi: pendingStop.stop,
              priceMid: pendingStop.stop,
              notionalUsd: "0",
              share: 0,
              positionCount: 0,
              distancePct: 0,
              topAccounts: [],
              callout: "Sign the pending stop",
            });
            setRoute("map");
          }}>Sign stop</button>
        </div>
      )}
      {zone && market && (
        <CascadeSheet
          zone={zone}
          market={market}
          account={wallet}
          exchange={exchange}
          freeEquity={account?.freeEquity ?? "0"}
          onClose={() => setZone(null)}
          onPending={(pending) => { savePending(pending); setPendingStop(pending); }}
          onCleared={() => { clearPending(); setPendingStop(null); }}
          pendingStop={pendingStop && pendingStop.pool === market.pool ? pendingStop : null}
        />
      )}
      {error && <div className="stamp">{error}</div>}
    </div>
  );
}
