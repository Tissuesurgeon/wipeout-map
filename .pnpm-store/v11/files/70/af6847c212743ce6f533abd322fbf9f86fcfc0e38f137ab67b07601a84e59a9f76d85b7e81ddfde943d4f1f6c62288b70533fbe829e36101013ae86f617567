// The MarketTypePlugin seam — the modularity boundary that lets a future
// order-book product (perp-binary, scalar, …) slot into the operator/venue +
// machinery surfaces without a parallel fork. Every market type is pinned to a
// venue forever at `createVenue` (the bytes4 `marketType`); this registry keys
// the type-specific fee-param codec + the machinery onboarding steps off that
// same id, so the admins and the preflight validators dispatch by market type
// rather than hardcoding binary.
export {};
