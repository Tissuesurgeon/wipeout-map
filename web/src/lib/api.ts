export type Market = {
  symbol: string;
  pool: string;
  mark: string | null;
  index: string | null;
  fundingRate: string | null;
  openInterest: string | null;
  imBps: number;
  mmBps: number;
  maxLeverage: number | null;
  feedOk: boolean;
  asOfBlock: string | null;
  ageSec: number;
  stale: boolean;
  marginBank: string;
  stopRegistry: string | null;
  tick: string;
  lot: string;
  minQty: string;
  quoteDecimals: number;
  oneBase: string;
  leadNotionalUsd?: string | null;
  leadSide?: "long" | "short" | null;
};

export type HeatBucket = {
  side: "long" | "short";
  priceLo: string;
  priceHi: string;
  notional: string;
  count: number;
  topAccounts: { account: string; notional: string }[];
};

export type HeatCluster = {
  side: "long" | "short";
  priceLo: string;
  priceHi: string;
  notional: string;
  count: number;
};

export type WipeZone = {
  rank: number;
  side: "long" | "short";
  priceLo: string;
  priceHi: string;
  priceMid: string;
  notionalUsd: string;
  share: number;
  positionCount: number;
  distancePct: number;
  topAccounts: { account: string; notional: string }[];
  callout: string;
};

export type Heatmap = {
  symbol: string;
  pool: string;
  mark: string;
  width: string;
  windowLo: string;
  windowHi: string;
  asOfBlock: string;
  ageSec: number;
  stale: boolean;
  feedOk: boolean;
  unreachable: number;
  finite: number;
  positionCount: number;
  totalAtRiskUsd?: string;
  coveragePct?: number;
  zones: WipeZone[];
  buckets?: HeatBucket[];
  clusters?: HeatCluster[];
};

export type PositionCard = {
  pool: string;
  symbol: string;
  side: "long" | "short";
  size: string;
  entry: string;
  mark: string;
  liq: string | null;
  liqKind: string;
  liqLabel: string;
  distancePct: number | null;
  status: "Healthy" | "Warning" | "Danger";
  feedOk: boolean;
  maxLeverage: number;
  cross: boolean;
};

export type AccountView = {
  account: string;
  asOfBlock: string;
  ageSec: number | null;
  stale: boolean;
  marginStatus: string | null;
  equity: string;
  mmReq: string;
  imReq: string;
  marginRatio: number | null;
  cross: boolean;
  marketsCount: number;
  freeEquity: string;
  positions: PositionCard[];
};

export type LiquidationRow = {
  tx: string;
  logIndex: number;
  symbol: string | null;
  account: string | null;
  side: string | null;
  size: string | null;
  price: string | null;
  predictedLiq: string | null;
  predictedNa?: boolean;
  hit: boolean;
  block: string | null;
  ts: number | null;
};

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + url, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => json<{ ok: boolean; ready: boolean; sweeping: boolean; markets: number; block: string; feedMode?: "reactivity" | "polling" }>("/api/health"),
  markets: () => json<{ markets: Market[] }>("/api/markets"),
  heatmap: (symbol: string, detail = false) => json<Heatmap>(`/api/heatmap/${symbol}${detail ? "?detail=1" : ""}`),
  pendingStops: (account: string) => json<{ orders: { tx: string; account: string; pool: string; params: { stop?: string; isBid?: boolean; sizeBefore?: string; quantity?: string; symbol?: string } }[] }>(`/api/orders/pending?account=${account}`),
  account: (address: string) => json<AccountView>(`/api/account/${address}`),
  liquidations: (symbol?: string) =>
    json<{ liquidations: LiquidationRow[] }>(`/api/liquidations?limit=40${symbol ? `&symbol=${symbol}` : ""}`),
  preview: (body: { pool: string; account: string; isBid: boolean; quantity: string; price: string }) =>
    json<{
      priceable: boolean;
      lockAmount: string | null;
      currentLiquidationPrice: string | null;
      projectedLiquidationPrice: string | null;
    }>("/api/preview", { method: "POST", body: JSON.stringify(body) }),
  order: (body: { tx: string; account?: string; pool?: string; kind: string; params: unknown; status?: string }) =>
    json<{ ok: boolean }>("/api/orders", { method: "POST", body: JSON.stringify(body) }),
};

function socketUrl(): string {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) return configured;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws`;
}

export function openSocket(
  onMessage: (msg: Record<string, unknown>) => void,
  onReconnect?: () => void,
): { close: () => void } {
  let stopped = false;
  let opened = false;
  let delay = 1_000;
  let socket: WebSocket | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const connect = () => {
    if (stopped) return;
    const ws = new WebSocket(socketUrl());
    socket = ws;
    ws.onopen = () => {
      delay = 1_000;
      if (opened) onReconnect?.();
      opened = true;
    };
    ws.onmessage = (ev) => {
      try {
        onMessage(JSON.parse(String(ev.data)) as Record<string, unknown>);
      } catch {
        /* ignore */
      }
    };
    ws.onerror = () => {
      ws.close();
    };
    ws.onclose = () => {
      if (stopped || socket !== ws) return;
      timer = setTimeout(connect, delay);
      delay = Math.min(delay * 2, 15_000);
    };
  };

  connect();
  return {
    close() {
      stopped = true;
      if (timer) clearTimeout(timer);
      socket?.close();
    },
  };
}
