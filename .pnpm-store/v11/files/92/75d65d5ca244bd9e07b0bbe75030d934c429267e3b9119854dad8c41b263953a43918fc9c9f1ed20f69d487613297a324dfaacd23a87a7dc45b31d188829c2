// Symbol grammar for the exchange API. A SYMBOL names a market;
// a TRADABLE symbol names something you can place an order on. For spot the two
// coincide; for outcome markets each outcome is its own tradable:
//
//   spot          SOMI/USDC
//   perp          BTC/USDSO:USDSO           (settle-suffixed swap notation)
//   binary        BTC-95000-31DEC26/USDC    (the market)
//                 BTC-95000-31DEC26/USDC#YES · …#NO   (the tradables)
//   categorical   US-ELECTION-28/USDC#TRUMP (reserved — same grammar, N outcomes)
//
// Everything before `#` follows the symbol conventions exchange tooling
// expects; the `#OUTCOME` suffix is ours (binary markets need one).
// Symbols are synthesized deterministically from the market row; collisions
// get a `-xxxx` marketId suffix so the mapping is always 1:1. Every unified method also accepts a raw ref (pool address,
// market id, or BinaryMarket address) anywhere a symbol is expected.

import type { Address } from "viem";
import type { Market } from "../markets.js";
import { InvalidInputError } from "../errors.js";
import { unreachable } from "../raise.js";
import { isChainMarketRef, type MarketHandle } from "../chainRef.js";

/**
 *  A parsed + resolved tradable: the market it lives on, and (for outcome
 *  markets) which outcome book it addresses.
 *
 * @category models
 */
export interface Tradable {
  /** The native market row this tradable lives on (union — narrow by `marketType`). */
  market: Market;
  /**
   *  Numeric chain id the market lives on. A market is unique to one chain, so
   *  this is where every write for the tradable is sent and where every read
   *  for it is answered.
   */
  chainId: number;
  /** Canonical MARKET symbol (no outcome suffix). */
  marketSymbol: string;
  /** Canonical tradable symbol (with outcome suffix where applicable). */
  symbol: string;
  /** Outcome label (binary: "YES" | "NO"); undefined for spot. */
  outcome?: string;
  /** Outcome index (binary: 0 = YES, 1 = NO); undefined for spot. */
  outcomeIndex?: number;
  /**
   *  The pool the tradable's orders go to — always `market.poolAddress`, so it
   *  carries that field's type rather than widening it back to `string`.
   */
  pool: Address;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Strip to [A-Za-z0-9.] so synthesized parts are grammar-safe. Case is
 *  preserved — venue token symbols are mixed-case identities ("USDso",
 *  "USDC.e") and consumers key on them verbatim. */
export function sanitizePart(s: string): string {
  return s.replace(/[^A-Za-z0-9.]+/g, "");
}

/**
 *  DDMONYY (UTC) — 31DEC26 — plus an HHMM component for intraday expiries
 *  (03JUL26-0930): series markets expire many times a day, and the time is
 *  what distinguishes them, so it belongs in the symbol.
 */
export function expiryCode(expirySec: number): string {
  const d = new Date(expirySec * 1000);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const date = `${day}${MONTHS[d.getUTCMonth()]}${String(d.getUTCFullYear() % 100).padStart(2, "0")}`;
  if (expirySec % 86400 === 0) return date;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${date}-${hh}${mm}`;
}

/** Trim a human-readable strike string ("95000.000000" → "95000"). */
function trimStrike(strike: string): string {
  if (!strike.includes(".")) return strike;
  return strike.replace(/\.?0+$/, "");
}

/**
 *  Synthesize the base market symbol (pre-collision-suffix). `codeOf` maps a
 *  token address to its currency code (ERC-20 symbol, cached by the caller).
 */
export function synthesizeSymbol(m: Market, codeOf: (token: Address) => string): string {
  if (m.marketType === "SPOT") {
    const base = m.baseSymbol ? sanitizePart(m.baseSymbol) : codeOf(m.baseToken);
    const quote = m.quoteSymbol ? sanitizePart(m.quoteSymbol) : codeOf(m.quoteToken);
    return `${base}/${quote}`;
  }
  if (m.marketType === "PERP") {
    // Settle-suffixed swap notation — a linear perp settles in its quote.
    const base = m.baseSymbol ? sanitizePart(m.baseSymbol) : codeOf(m.baseToken);
    const quote = m.quoteSymbol ? sanitizePart(m.quoteSymbol) : codeOf(m.quoteToken);
    return `${base}/${quote}:${quote}`;
  }
  const b = m;
  const asset = sanitizePart(b.asset) || "MKT";
  // A chain-seeded row knows no strike. "0" is the reference-mode fragment and
  // would read as an up/down market, so the unknown takes its own placeholder —
  // same reflex as `asset`'s "MKT" fallback above.
  const strike = b.strike == null ? "NA" : sanitizePart(trimStrike(b.strike));
  const quote = codeOf(b.collateral);
  return `${asset}-${strike}-${expiryCode(Number(b.expiry))}/${quote}`;
}

/**
 *  Deterministic collision tiebreaker: the LAST 4 hex chars of the market id,
 *  inserted on the BASE side of the slash so `BASE/QUOTE` grammar stays intact
 *  (ETH-…-0930-9FC7/TUSDC, never …/TUSDC-9FC7).
 *
 *  MUST be the trailing (not leading) chars: a binary market id is the module's
 *  bytes32 `marketId` = `bytes32(++marketSeq)`, i.e. `0x0000…0013` — the LEADING
 *  hex is all zeros for every market, so `slice(0,4)` produced the SAME `-0000`
 *  tag for every colliding market and the tiebreaker didn't actually break the
 *  tie (two markets sharing an expiry-derived symbol — e.g. a 4h and a 24h market
 *  both expiring at the same wall-clock boundary — collapsed to one). The
 *  trailing chars are the part that varies (spot/perp ids are pool addresses,
 *  which vary throughout, so the tail is distinguishing there too).
 */
export function withCollisionSuffix(symbol: string, m: Market): string {
  const tag = `-${m.id.replace(/^0x/, "").slice(-4).toUpperCase()}`;
  const slash = symbol.lastIndexOf("/");
  if (slash === -1) return `${symbol}${tag}`;
  return `${symbol.slice(0, slash)}${tag}${symbol.slice(slash)}`;
}

/**
 *  Second-level tiebreaker for a symbol that STILL collides after
 *  {@link withCollisionSuffix}: the same CREATE2 pool on two chains carries the
 *  same id tail, so the chain id is the only remaining distinguishing input.
 *  Inserted on the base side of the slash like the id tag.
 */
export function withChainSuffix(symbol: string, chainId: number): string {
  const tag = `-C${chainId}`;
  const slash = symbol.lastIndexOf("/");
  if (slash === -1) return `${symbol}${tag}`;
  return `${symbol.slice(0, slash)}${tag}${symbol.slice(slash)}`;
}

/**
 *  Outcome labels per market kind. Binary is the N=2 case; categorical markets
 *  will carry their own labels on the market row.
 */
export function outcomesOf(m: Market): { label: string; index: number }[] {
  if (m.marketType === "BINARY") {
    return [
      { label: "YES", index: 0 },
      { label: "NO", index: 1 },
    ];
  }
  return [];
}

export function tradableSymbol(marketSymbol: string, outcome?: string): string {
  return outcome ? `${marketSymbol}#${outcome}` : marketSymbol;
}

/** Split a tradable symbol into (marketSymbol, outcome?). */
export function splitSymbol(symbol: string): { marketSymbol: string; outcome?: string } {
  const i = symbol.indexOf("#");
  if (i === -1) return { marketSymbol: symbol };
  return { marketSymbol: symbol.slice(0, i), outcome: symbol.slice(i + 1).toUpperCase() || undefined };
}

/** True when `ref` looks like an on-chain ref rather than a symbol. */
export function isChainRef(ref: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(ref) || /^0x[0-9a-fA-F]{64}$/.test(ref);
}

/** The chain a registry row was stamped with, or an SDK bug: the facade stamps every row before `build`. */
function chainOf(m: Market): number {
  return m.chainId ?? unreachable(`market ${m.id} reached the symbol registry without a chainId`);
}

/**
 * The symbol registry built by `loadMarkets()`: canonical symbols plus reverse
 * lookups from every on-chain identifier, so any handle resolves to a Tradable.
 *
 * Built over the UNION of every configured chain's markets. Symbols are unique
 * across that union and carry no chain name; on-chain refs (pool, market id,
 * BinaryMarket address) are keyed per chain, and a bare ref resolves only when
 * exactly one chain knows it.
 */
export class SymbolRegistry {
  /** marketSymbol -> market (each row carries its `chainId`) */
  readonly bySymbol = new Map<string, Market>();
  /** `${chainId}:${lowercased ref}` -> marketSymbol */
  private byChainRef = new Map<string, string>();
  /** lowercased ref -> every marketSymbol that ref names, across chains */
  private byBareRef = new Map<string, Set<string>>();

  /** (Re)build from a market list. Returns the canonical symbol per `${chainId}:${id}`. */
  build(markets: Market[], codeOf: (token: Address) => string): Map<string, string> {
    this.bySymbol.clear();
    this.byChainRef.clear();
    this.byBareRef.clear();
    // First pass: synthesize; collect collisions.
    const proposed = new Map<string, Market[]>();
    for (const m of markets) {
      const s = synthesizeSymbol(m, codeOf);
      const arr = proposed.get(s) ?? [];
      arr.push(m);
      proposed.set(s, arr);
    }
    const canonical = new Map<string, string>();
    for (const [s, ms] of proposed) {
      // Id-tail tiebreak first (the single-chain rule), then the chain tag for
      // the pairs the id tail cannot separate — the same CREATE2 pool on two chains.
      const tagged = new Map<string, Market[]>();
      for (const m of ms) {
        const sym = ms.length === 1 ? s : withCollisionSuffix(s, m);
        const arr = tagged.get(sym) ?? [];
        arr.push(m);
        tagged.set(sym, arr);
      }
      for (const [sym, group] of tagged) {
        for (const m of group) {
          const finalSym = group.length === 1 ? sym : withChainSuffix(sym, chainOf(m));
          this.register(m, finalSym, canonical);
        }
      }
    }
    return canonical;
  }

  private register(m: Market, sym: string, canonical: Map<string, string>): void {
    const chainId = chainOf(m);
    canonical.set(registryKey(chainId, m.id), sym);
    this.bySymbol.set(sym, m);
    const refs = [m.id, m.poolAddress, ...(m.marketType === "BINARY" ? [m.marketAddress] : [])];
    for (const ref of refs) {
      const lc = ref.toLowerCase();
      this.byChainRef.set(registryKey(chainId, lc), sym);
      const set = this.byBareRef.get(lc) ?? new Set<string>();
      set.add(sym);
      this.byBareRef.set(lc, set);
    }
  }

  /** Whether `ref` (a market id, pool or BinaryMarket address) resolves on `chainId`. */
  has(chainId: number, ref: string): boolean {
    return this.byChainRef.has(registryKey(chainId, ref));
  }

  /**
   *  Add one market to RESOLUTION only: it becomes addressable by symbol, by
   *  market id and (binary) by BinaryMarket address, but it is not part of the
   *  tradable listing `build` produced. This is how a SETTLED binary market a
   *  wallet still holds a position in stays redeemable: `build` cannot carry
   *  those (finalized series accumulate without bound), so they arrive one at a
   *  time from whatever row named them. Returns the market's symbol.
   *
   *  Deliberately never claims the pool address. A binary pool is recycled onto
   *  successive markets, so by the time a market is settled its pool usually
   *  serves a LIVE market that owns that ref — exactly the mislabelling that
   *  keying by pool caused. Idempotent, and never overwrites a market `build`
   *  registered.
   */
  addSettled(m: Market, codeOf: (token: Address) => string): string {
    this.prepareSettled([m], codeOf)();
    return this.byChainRef.get(registryKey(chainOf(m), m.id)) ?? unreachable("prepared settled row lost its ref");
  }

  /** Prepare symbols, collisions and reverse refs for a whole operation without mutating the registry. */
  prepareSettled(markets: readonly Market[], codeOf: (token: Address) => string): () => void {
    const symbols = new Map<string, Market>();
    const chainRefs = new Map<string, string>();
    const bareRefs = new Map<string, Set<string>>();
    for (const m of markets) {
      const chainId = chainOf(m);
      const key = registryKey(chainId, m.id);
      if (this.byChainRef.has(key) || chainRefs.has(key)) continue;
      const occupied = (sym: string) => this.bySymbol.has(sym) || symbols.has(sym);
      let sym = synthesizeSymbol(m, codeOf);
      // Keep live symbols and earlier prepared rows, using the existing tiebreaks.
      if (occupied(sym)) sym = withCollisionSuffix(sym, m);
      if (occupied(sym)) sym = withChainSuffix(sym, chainId);
      if (occupied(sym)) unreachable(`settled market ${m.id} still collides with ${sym} after every tiebreak`);
      symbols.set(sym, m);
      const refs = m.marketType === "BINARY" ? [m.id, m.marketAddress] : [m.id];
      for (const ref of refs) {
        const lc = ref.toLowerCase();
        chainRefs.set(registryKey(chainId, lc), sym);
        const set = bareRefs.get(lc) ?? new Set(this.byBareRef.get(lc));
        set.add(sym);
        bareRefs.set(lc, set);
      }
    }
    // Publication only copies already prepared values; no mapper runs here.
    return () => {
      for (const [sym, m] of symbols) this.bySymbol.set(sym, m);
      for (const [key, sym] of chainRefs) this.byChainRef.set(key, sym);
      for (const [ref, syms] of bareRefs) this.byBareRef.set(ref, syms);
    };
  }

  /**
   *  Resolve any handle — a market/tradable symbol, an on-chain ref, or a
   *  {@link ChainMarketRef} — to a Tradable. For outcome markets addressed
   *  WITHOUT an outcome, the default tradable is outcome 0 (YES). Throws on
   *  unknown handles, and on a bare on-chain ref that more than one configured
   *  chain knows.
   */
  resolve(handle: MarketHandle): Tradable {
    const chainPin = isChainMarketRef(handle) ? handle.chainId : undefined;
    const ref = isChainMarketRef(handle) ? handle.id : handle;
    let marketSymbol: string;
    let outcome: string | undefined;
    if (isChainRef(ref)) {
      marketSymbol = this.symbolForChainRef(ref, chainPin);
    } else {
      ({ marketSymbol, outcome } = splitSymbol(ref));
    }
    const market = this.bySymbol.get(marketSymbol);
    if (!market) throw new InvalidInputError(`unknown symbol ${ref} — call loadMarkets() first`);
    const chainId = chainOf(market);
    if (chainPin !== undefined && chainPin !== chainId) {
      throw new InvalidInputError(`${marketSymbol} lives on chain ${chainId}, not chain ${chainPin}`);
    }

    const outcomes = outcomesOf(market);
    if (outcomes.length === 0) {
      if (outcome) throw new InvalidInputError(`${marketSymbol} is a ${market.marketType} market — it has no outcomes`);
      return { market, chainId, marketSymbol, symbol: marketSymbol, pool: market.poolAddress };
    }
    const chosen = outcome ? outcomes.find((o) => o.label === outcome) : outcomes[0]; // outcome markets default to outcome 0 (YES)
    if (!chosen) {
      throw new InvalidInputError(
        `${marketSymbol} has no outcome "${outcome}" (has: ${outcomes.map((o) => o.label).join(", ")})`,
      );
    }
    return {
      market,
      chainId,
      marketSymbol,
      symbol: tradableSymbol(marketSymbol, chosen.label),
      outcome: chosen.label,
      outcomeIndex: chosen.index,
      pool: market.poolAddress,
    };
  }

  /** The market symbol an on-chain ref names, on one chain or across all of them. */
  private symbolForChainRef(ref: string, chainPin: number | undefined): string {
    const lc = ref.toLowerCase();
    if (chainPin !== undefined) {
      const sym = this.byChainRef.get(registryKey(chainPin, lc));
      if (!sym)
        throw new InvalidInputError(`unknown market ref ${ref} on chain ${chainPin} — call loadMarkets() first`);
      return sym;
    }
    const syms = this.byBareRef.get(lc);
    if (!syms || syms.size === 0) throw new InvalidInputError(`unknown market ref ${ref} — call loadMarkets() first`);
    if (syms.size > 1) {
      const chains = [...syms].map((sym) =>
        chainOf(this.bySymbol.get(sym) ?? unreachable(`symbol ${sym} lost its row`)),
      );
      throw new InvalidInputError(
        `market ref ${ref} exists on chains ${chains.join(", ")} — pass { chainId, id } to pick one`,
      );
    }
    const [only] = syms;
    return only ?? unreachable("non-empty set had no first element");
  }
}

/** `${chainId}:${lowercased ref}` — the registry's per-chain key. */
export function registryKey(chainId: number, ref: string): string {
  return `${chainId}:${ref.toLowerCase()}`;
}
