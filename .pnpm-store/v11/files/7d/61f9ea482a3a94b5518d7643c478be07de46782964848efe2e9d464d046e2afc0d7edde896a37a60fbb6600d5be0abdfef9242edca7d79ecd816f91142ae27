// The binary kind, as one actor.
//
//   import * as Binary from "./binary";
//   Binary.getSettlement(client, marketId);
//   Binary.redeem(w, params);
//   Binary.mintSet(w, params);
//
// A SINK: nothing inside src/ imports this file. Internal code deep-imports the
// concept module it needs (`./binary/settlement`), which is what keeps this barrel
// structurally incapable of creating an import cycle — it has no internal
// importers to cycle back through. It exists for the package barrel, for tests
// that want the kind in one binding, and as the one-line seam if the
// single-facade deviation is ever loosened (`export * as Binary`).
//
// Flat by design (`Binary.getSettlement`, not `Binary.Settlement.get`) — verified
// collision-free across the kind's members.

export * from "./settlement.js";
export * from "./sets.js";
export * from "./portfolio.js";
export * from "./plugin.js";
