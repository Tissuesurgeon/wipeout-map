// The producer-only change-operation marker for DEXSVC-125 account batches.
//
// NOT part of the SDK's public surface — SMK-290 owns the account API — but Hasura
// exposes this enum as a custom SCALAR with no member list, so codegen cannot type it
// without a named union to map onto, and test/enumParity.test.ts pins that union against
// indexer/schema.graphql so the two cannot drift.
export type AccountChangeOperation = "REPLACE" | "REMOVE";
