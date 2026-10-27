import { formatUnits, parseUnits } from "viem";

export function bi(value: bigint | number | string | null | undefined): bigint {
  if (typeof value === "bigint") return value;
  if (value === null || value === undefined || value === "") return 0n;
  return BigInt(value);
}

export function unitDigits(oneBase: bigint | string): number {
  let value = typeof oneBase === "bigint" ? oneBase : BigInt(oneBase || "1");
  let digits = 0;
  while (value > 1n && digits < 36) {
    value /= 10n;
    digits += 1;
  }
  return digits || 18;
}

export function dec(value: bigint, decimals = 18): string {
  return formatUnits(value, decimals);
}

export function raw(human: string, decimals = 18): bigint {
  return parseUnits(human, decimals);
}

/** Signed ratio in percent, 4 decimal places, from bigint parts. */
export function pct(numer: bigint, denom: bigint): number | null {
  if (denom === 0n) return null;
  const scaled = (numer * 1_000_000n) / denom;
  return Number(scaled) / 10_000;
}

export function ageSec(updatedAt: number, now = Date.now()): number {
  return Math.max(0, Math.round((now - updatedAt) / 1000));
}

export function isStale(updatedAt: number, now = Date.now()): boolean {
  return now - updatedAt > 30_000;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTimeout(err: unknown): boolean {
  const text = errText(err).toLowerCase();
  return text.includes("took too long") || text.includes("timed out") || text.includes("timeout");
}

export async function withBackoff<T>(
  label: string,
  fn: () => Promise<T>,
  tries = 5,
): Promise<T> {
  let delay = 250;
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i === tries - 1 || isTimeout(err)) break;
      console.warn(`[backoff] ${label} attempt ${i + 1} failed: ${errText(err)}`);
      await sleep(delay);
      delay *= 2;
    }
  }
  throw last instanceof Error ? last : new Error(`${label} failed`);
}

export function errText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      const item = items[index];
      if (item === undefined) return;
      out[index] = await fn(item, index);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

export function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
