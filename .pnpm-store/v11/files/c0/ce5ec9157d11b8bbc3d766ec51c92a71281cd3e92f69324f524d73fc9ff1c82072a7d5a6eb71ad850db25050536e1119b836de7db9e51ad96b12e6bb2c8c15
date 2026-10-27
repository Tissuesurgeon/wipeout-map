// Compile-time proof that `SomniaMarketsClient` still matches the concept modules
// it delegates to.
//
// THE PROBLEM THIS SOLVES. `SomniaMarketsClient` is a hand-written interface
// mirroring ~105 delegations, and its doc comments are what TypeDoc publishes —
// so it cannot simply be derived away. But hand-mirroring means a concept
// function's signature can drift from the interface that fronts it, and nothing
// notices: `createClient` satisfies the INTERFACE, and the interface is the thing
// that drifted. CONVENTIONS.md's "Definition of done" documents the resulting tax
// (three files to touch for one new read).
//
// So: keep the interface (and its docs), and assert the pairing HERE. A signature
// that drifts becomes a `tsc` error instead of a silently-wrong published type.
//
// WHY THE ARITIES DIFFER. Every indexer read takes the client's config as trailing
// arguments the client injects — `Fills.getFills(pool, opts, url)` fronted by
// `client.getFills(pool, opts)`. `WithoutConfig` strips exactly that tail, so the
// two shapes can be compared directly.
//
// This module exports nothing at runtime; it exists for its type errors.
export {};
