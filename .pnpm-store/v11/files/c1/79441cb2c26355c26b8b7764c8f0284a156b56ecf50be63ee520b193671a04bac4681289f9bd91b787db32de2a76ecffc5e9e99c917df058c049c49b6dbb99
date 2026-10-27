// The producer-only readiness marker for the DEXSVC-123 account capability.
//
// NOT part of the SDK's public surface — SMK-290 owns the account-snapshot API —
// but codegen needs one NAMED type to map the `accountcapabilityreadiness` wire
// scalar onto, and test/enumParity.test.ts needs to import that same type to pin
// it against indexer/schema.graphql. Inlining the union in codegen.ts left the
// parity array unbound to anything, so the schema and the array could be changed
// together while the generated wire type silently stayed stale.
export type AccountCapabilityReadiness = "READY" | "UNAVAILABLE";
