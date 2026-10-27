import type { Address } from "viem";
import type { Market } from "../markets.js";
import { type MarketHandle } from "../chainRef.js";
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
/** Strip to [A-Za-z0-9.] so synthesized parts are grammar-safe. Case is
 *  preserved — venue token symbols are mixed-case identities ("USDso",
 *  "USDC.e") and consumers key on them verbatim. */
export declare function sanitizePart(s: string): string;
/**
 *  DDMONYY (UTC) — 31DEC26 — plus an HHMM component for intraday expiries
 *  (03JUL26-0930): series markets expire many times a day, and the time is
 *  what distinguishes them, so it belongs in the symbol.
 */
export declare function expiryCode(expirySec: number): string;
/**
 *  Synthesize the base market symbol (pre-collision-suffix). `codeOf` maps a
 *  token address to its currency code (ERC-20 symbol, cached by the caller).
 */
export declare function synthesizeSymbol(m: Market, codeOf: (token: Address) => string): string;
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
export declare function withCollisionSuffix(symbol: string, m: Market): string;
/**
 *  Second-level tiebreaker for a symbol that STILL collides after
 *  {@link withCollisionSuffix}: the same CREATE2 pool on two chains carries the
 *  same id tail, so the chain id is the only remaining distinguishing input.
 *  Inserted on the base side of the slash like the id tag.
 */
export declare function withChainSuffix(symbol: string, chainId: number): string;
/**
 *  Outcome labels per market kind. Binary is the N=2 case; categorical markets
 *  will carry their own labels on the market row.
 */
export declare function outcomesOf(m: Market): {
    label: string;
    index: number;
}[];
export declare function tradableSymbol(marketSymbol: string, outcome?: string): string;
/** Split a tradable symbol into (marketSymbol, outcome?). */
export declare function splitSymbol(symbol: string): {
    marketSymbol: string;
    outcome?: string;
};
/** True when `ref` looks like an on-chain ref rather than a symbol. */
export declare function isChainRef(ref: string): boolean;
/**
 * The symbol registry built by `loadMarkets()`: canonical symbols plus reverse
 * lookups from every on-chain identifier, so any handle resolves to a Tradable.
 *
 * Built over the UNION of every configured chain's markets. Symbols are unique
 * across that union and carry no chain name; on-chain refs (pool, market id,
 * BinaryMarket address) are keyed per chain, and a bare ref resolves only when
 * exactly one chain knows it.
 */
export declare class SymbolRegistry {
    /** marketSymbol -> market (each row carries its `chainId`) */
    readonly bySymbol: Map<string, Market>;
    /** `${chainId}:${lowercased ref}` -> marketSymbol */
    private byChainRef;
    /** lowercased ref -> every marketSymbol that ref names, across chains */
    private byBareRef;
    /** (Re)build from a market list. Returns the canonical symbol per `${chainId}:${id}`. */
    build(markets: Market[], codeOf: (token: Address) => string): Map<string, string>;
    private register;
    /** Whether `ref` (a market id, pool or BinaryMarket address) resolves on `chainId`. */
    has(chainId: number, ref: string): boolean;
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
    addSettled(m: Market, codeOf: (token: Address) => string): string;
    /** Prepare symbols, collisions and reverse refs for a whole operation without mutating the registry. */
    prepareSettled(markets: readonly Market[], codeOf: (token: Address) => string): () => void;
    /**
     *  Resolve any handle — a market/tradable symbol, an on-chain ref, or a
     *  {@link ChainMarketRef} — to a Tradable. For outcome markets addressed
     *  WITHOUT an outcome, the default tradable is outcome 0 (YES). Throws on
     *  unknown handles, and on a bare on-chain ref that more than one configured
     *  chain knows.
     */
    resolve(handle: MarketHandle): Tradable;
    /** The market symbol an on-chain ref names, on one chain or across all of them. */
    private symbolForChainRef;
}
/** `${chainId}:${lowercased ref}` — the registry's per-chain key. */
export declare function registryKey(chainId: number, ref: string): string;
