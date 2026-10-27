import type { Address } from "viem";
/**
 *  A market named together with the chain it lives on. Accepted wherever a
 *  symbol, pool address or market id is accepted (`exchange.market(ref)`,
 *  `createOrder(ref, …)`, `fetchOrderBook(ref)`, …).
 *
 *  **Details**
 *
 *  `id` is anything the symbol table resolves — a symbol, a tradable symbol
 *  (`…#YES`), a pool address, a market id or a BinaryMarket address. `chainId`
 *  pins which chain's table answers, so an id that exists on two chains (the
 *  same CREATE2 pool on L1 and Hideki) is never ambiguous.
 *
 * @category models
 */
export interface ChainMarketRef {
    /** Numeric chain id the market lives on. */
    chainId: number;
    /** Symbol, tradable symbol, pool address, market id or BinaryMarket address. */
    id: string;
}
/**
 *  An order named together with its chain and pool. `cancelOrder` accepts one
 *  in place of a bare decimal order id.
 *
 * @category models
 */
export interface ChainOrderRef {
    /** Numeric chain id the order's pool lives on. */
    chainId: number;
    /** The pool the order rests on (lowercased or checksummed — compared case-insensitively). */
    pool: Address;
    /** On-chain order id, decimal string. */
    id: string;
}
/**
 *  What every unified verb accepts as a market handle: a bare symbol / address /
 *  id string, or a {@link ChainMarketRef}.
 *
 * @category models
 */
export type MarketHandle = string | ChainMarketRef;
/** True when `handle` is a {@link ChainMarketRef} rather than a bare string. */
export declare function isChainMarketRef(handle: MarketHandle): handle is ChainMarketRef;
/** True when `id` is a {@link ChainOrderRef} rather than a bare order id string. */
export declare function isChainOrderRef(id: string | ChainOrderRef): id is ChainOrderRef;
/** Build a {@link ChainMarketRef}. */
export declare function chainMarketRef(chainId: number, id: string): ChainMarketRef;
/** Build a {@link ChainOrderRef}. */
export declare function chainOrderRef(chainId: number, pool: Address, id: string): ChainOrderRef;
