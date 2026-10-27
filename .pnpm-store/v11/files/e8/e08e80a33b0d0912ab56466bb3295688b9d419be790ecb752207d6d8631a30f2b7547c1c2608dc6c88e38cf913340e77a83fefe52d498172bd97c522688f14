// Chain-qualified references. A market id, pool address or order id is only
// unique on ONE chain: pools are CREATE2 deployments and the binary module's
// `bytes32(++marketSeq)` restarts per chain, so two chains can hand out the
// same bare id. A facade that spans chains therefore accepts a `{ chainId, id }`
// pair wherever it accepts a bare id, and resolves a bare id only when exactly
// one configured chain knows it.
//
// Pure types + guards. No connection, no I/O — exported from the root barrel.
/** True when `handle` is a {@link ChainMarketRef} rather than a bare string. */
export function isChainMarketRef(handle) {
    return (typeof handle === "object" && handle !== null && typeof handle.chainId === "number" && typeof handle.id === "string");
}
/** True when `id` is a {@link ChainOrderRef} rather than a bare order id string. */
export function isChainOrderRef(id) {
    return typeof id === "object" && id !== null && typeof id.chainId === "number" && typeof id.id === "string";
}
/** Build a {@link ChainMarketRef}. */
export function chainMarketRef(chainId, id) {
    return { chainId, id };
}
/** Build a {@link ChainOrderRef}. */
export function chainOrderRef(chainId, pool, id) {
    return { chainId, pool, id };
}
