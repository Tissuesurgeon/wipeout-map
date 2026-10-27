// Types for the Somnia-native RPC surface.
//
// LOCKSTEP: mirrors github.com/somnia-chain/somnia2 —
// `somnia/api/handlers/somnia_api_handlers.h` (the method list + request shapes)
// and `somnia_api_types.h` (the response structs). Every shape below was ALSO
// captured from a live Shannon node; where the header and the wire disagreed, the
// wire won. See rpc.ts for the request encodings, which are the part a caller is
// most likely to get wrong.
//
// A WORD ON FIELD NAMES. The node serialises its C++ struct members verbatim, with
// no case conversion — so the wire is `snake_case` for the block structs
// (`consensus_block.block_number`) and `camelCase` for the statistics struct
// (`numSuccessfulTransactions`), because that is how the two structs happen to be
// written. Rather than pass that inconsistency on, this module decodes into one
// camelCase surface with `bigint` quantities. The raw wire shapes are kept below as
// `Rpc*` types so the mapping is auditable and a caller who wants the untouched
// payload can still reach for them.
export {};
