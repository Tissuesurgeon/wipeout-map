export type PendingStop = {
  account: string;
  pool: string;
  symbol: string;
  isBid: boolean;
  stop: string;
  sizeBefore: string;
  quantity: string;
  entryHash: string;
};

const KEY = "wipeout.slPending";

export function loadPending(): PendingStop | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingStop;
    if (!parsed.entryHash || !parsed.pool || !parsed.account) return null;
    if (!parsed.quantity) parsed.quantity = "";
    return parsed;
  } catch {
    return null;
  }
}

export function savePending(pending: PendingStop): void {
  localStorage.setItem(KEY, JSON.stringify(pending));
}

export function clearPending(): void {
  localStorage.removeItem(KEY);
}
