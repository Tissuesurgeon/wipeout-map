// Write side of MarketsCore — registering/updating operators, creating/updating
// venues. This admin surface adds only its MarketsCore pinning and the
// operator/venue id decoding; signing and sending ride the shared machinery
// writer (makeMachineryWriter — per-call nonce, eth_sendRawTransactionSync
// with the eth_sendRawTransaction fallback), like every other admin surface.
import { decodeEventLog, } from "viem";
import * as IndexerRead from "./indexerRead.js";
import * as MachineryWriter from "./machineryWriter.js";
import { graphql } from "./gql/gql.js";
import { IndexerError, NotConfiguredError, RpcError } from "./errors.js";
import * as OperatorAbi from "./operatorAbi.js";
export function createOperatorAdminWithDeps(config, deps) {
    const marketsCore = config.marketsCore ?? deps.getConfig().addresses?.marketsCore;
    if (!marketsCore) {
        throw new NotConfiguredError("marketsCore or config.addresses.marketsCore", "createOperatorAdmin");
    }
    // Every send rides the shared machinery writer (signer resolution + the
    // realtime-with-fallback broadcast), pinned to the one MarketsCore target.
    const writer = MachineryWriter.makeMachineryWriter(config, deps, "createOperatorAdmin");
    const execute = (w) => writer.execute({
        to: marketsCore,
        abi: OperatorAbi.marketsCoreWriteAbi,
        functionName: w.functionName,
        args: w.args,
        gas: w.gas,
    });
    function decodeOperatorId(receipt) {
        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: OperatorAbi.marketsCoreEventsAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "OperatorRegistered")
                    return Number(decoded.args.operatorId);
            }
            catch {
                continue;
            }
        }
        throw new RpcError("registerOperator", "the receipt carried no OperatorRegistered event");
    }
    function decodeVenueId(receipt) {
        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: OperatorAbi.marketsCoreEventsAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "VenueCreated")
                    return decoded.args.venueId;
            }
            catch {
                continue;
            }
        }
        throw new RpcError("createVenue", "the receipt carried no VenueCreated event");
    }
    const toTuple = (c) => [c.feeParams, c.feeRecipientOverride, c.policy, c.signer, c.creationEnabled, c.context ?? "0x"];
    return {
        async registerOperator(p) {
            const result = await execute({
                functionName: "registerOperator",
                args: [p.feeRecipient, p.enabled, p.policy, p.context ?? "0x"],
                gas: p.gas,
            });
            return { ...result, operatorId: decodeOperatorId(result.receipt) };
        },
        async updateOperator(p) {
            return execute({
                functionName: "updateOperator",
                args: [p.operatorId, p.feeRecipient, p.enabled, p.policy, p.context ?? "0x"],
                gas: p.gas,
            });
        },
        async setOperatorEnabled(p) {
            return execute({ functionName: "setOperatorEnabled", args: [p.operatorId, p.enabled], gas: p.gas });
        },
        async transferOperatorOwnership(p) {
            return execute({
                functionName: "transferOperatorOwnership",
                args: [p.operatorId, p.newOwner],
                gas: p.gas,
            });
        },
        async acceptOperatorOwnership(p) {
            return execute({ functionName: "acceptOperatorOwnership", args: [p.operatorId], gas: p.gas });
        },
        async createVenue(p) {
            const result = await execute({
                functionName: "createVenue",
                args: [p.operatorId, p.marketType, toTuple(p.config)],
                gas: p.gas,
            });
            return { ...result, venueId: decodeVenueId(result.receipt) };
        },
        async updateVenue(p) {
            return execute({
                functionName: "updateVenue",
                args: [p.operatorId, p.venueId, toTuple(p.config)],
                gas: p.gas,
            });
        },
        async setVenueEnabled(p) {
            return execute({
                functionName: "setVenueEnabled",
                args: [p.operatorId, p.venueId, p.creationEnabled],
                gas: p.gas,
            });
        },
    };
}
// `venueCount` is a denormalized column on the Operator row (the indexer bumps
// it on VenueCreated) — read as O(1), NOT by counting the `venues` relationship,
// which wouldn't scale to thousands of venues per operator.
// prettier-ignore
const OperatorFields = graphql(`
  fragment OperatorFields on Operator {
    operatorId
    owner
    feeRecipient
    enabled
    policy
    context
    pendingOwner
    venueCount
    createdAtTimestamp
    updatedAtTimestamp
    updatedAtBlock
    marketCount
    cumulativeQuoteVolume
    protocolFeesCollected
    settlementFeesCollected
    builderFeesCollected
  }
`);
// prettier-ignore
const VenueFields = graphql(`
  fragment VenueFields on Venue {
    venueId
    operatorId
    marketType
    feeParams
    feeRecipientOverride
    policy
    signer
    creationEnabled
    context
    createdAtTimestamp
    updatedAtTimestamp
    updatedAtBlock
    marketCount
    cumulativeQuoteVolume
    protocolFeesCollected
    settlementFeesCollected
    builderFeesCollected
  }
`);
/**
 *  List operators, newest-first by id, paginated. Every field of `opts` is
 *  optional; pass `owner` to scope to one owner's operators (the exact,
 *  indexed equivalent of "my operators" — no log scan), `enabled` to filter by
 *  the kill switch, and `limit`/`offset` to page. Venue counts read the
 *  denormalized `Operator.venueCount` column (O(1) — NOT the `venues`
 *  relationship, which wouldn't scale to thousands of venues per operator).
 */
export async function listOperators(opts = {}, indexerUrl) {
    const data = await IndexerRead.gqlRequest(OperatorsQuery, { where: operatorWhere(opts), limit: opts.limit ?? 20, offset: opts.offset ?? 0 }, indexerUrl);
    return data.Operator.map((r) => toIndexedOperator(r, "Operators"));
}
/** The wire shape of a Hasura `BigInt`: unsigned decimal digits, nothing else. */
const UNSIGNED_DECIMAL = /^\d+$/;
/** Parse the wire `updatedAtBlock` into the `bigint` the public row declares.
 *
 *  `BigInt()` is NOT a validation boundary and cannot be used as one. It coerces
 *  `""` and whitespace to `0n`, reads `"0x10"` as 16, and accepts a leading
 *  minus - so the malformed values likeliest to arrive would have passed through
 *  as plausible block numbers rather than raising. A blank marker becoming block
 *  0 is the worst of them: the probe publishes it, and a row that went blank and
 *  back would read as two writes and page. The shape is checked first, and
 *  `BigInt` only converts what has already been proven to be digits.
 *
 *  The RUNTIME TYPE is checked before the shape, and that ordering is load
 *  bearing rather than defensive habit. `RegExp.test` coerces its argument to a
 *  string, so a JSON NUMBER on the wire would be stringified and sail through
 *  `^\d+$`. By then `JSON.parse` has already rounded it through an IEEE double:
 *  9007199254740993 arrives as 9007199254740992, matches the digits test, and
 *  converts to a bigint that is silently off by one - destroying the exact
 *  boundary this mapper exists to establish. The static type says `string`, but
 *  the value comes off the wire, so the type is a claim about the schema and not
 *  a guarantee about the bytes. Hence `typeof` first (SDK-TYPE-007).
 *
 *  The raise matters because this runs AFTER `gqlRequest` has normalized
 *  transport and GraphQL errors, so anything thrown here escapes the public
 *  boundary uncaught by a caller narrowing on `IndexerError`. `operation` is the
 *  GraphQL document name, per the SDK's convention. */
function toUpdatedAtBlock(raw, operation) {
    if (typeof raw !== "string" || !UNSIGNED_DECIMAL.test(raw)) {
        throw new IndexerError(operation, `row carried a non-numeric updatedAtBlock: ${JSON.stringify(raw)}`);
    }
    return BigInt(raw);
}
/** The one place the generated Operator row becomes the public contract.
 *
 *  A spread with one override rather than a field-by-field copy: the compiler
 *  still checks the result against {@link IndexedOperator}, so a column the
 *  public type declares and the query stops selecting is a build error, while a
 *  column added to both needs no edit here. `updatedAtBlock` is the only field
 *  that is not its wire representation - see its doc for why (SDK-TYPE-007). */
function toIndexedOperator(r, operation) {
    return { ...r, updatedAtBlock: toUpdatedAtBlock(r.updatedAtBlock, operation) };
}
/** As {@link toIndexedOperator}, for the Venue row. */
function toIndexedVenue(r, operation) {
    return { ...r, updatedAtBlock: toUpdatedAtBlock(r.updatedAtBlock, operation) };
}
/**
 *  Server-side COUNT of operators matching a filter (Hasura `Operator_aggregate`),
 *  so a directory learns its total without loading every row. `_aggregate` is
 *  hidden from envio's public role — this needs the privileged `headers`
 *  (server-only), like {@link countBinaryMarkets}.
 *
 *  Without that header the total is bounded by
 *  {@link IndexerRead.COUNT_FALLBACK_CAP}; `Operator` is orders of magnitude
 *  below it.
 */
export async function countOperators(opts, indexerUrl, headers) {
    return IndexerRead.aggregateCount(OperatorCountDocuments, operatorWhere(opts), indexerUrl, headers);
}
/**
 *  Fetch one operator by id (null if never registered — a directory or a
 *  hand-typed id can miss).
 */
export async function getOperator(operatorId, indexerUrl) {
    const data = await IndexerRead.gqlRequest(OperatorByPkQuery, { id: String(operatorId) }, indexerUrl);
    return data.Operator_by_pk ? toIndexedOperator(data.Operator_by_pk, "OperatorByPk") : null;
}
/**
 *  List venues, creation-order, optionally scoped to one operator and/or
 *  market type and/or the venue-level creation flag. Paginated (venues per
 *  operator are few, but a global venue browse can be large).
 */
export async function listVenues(opts = {}, indexerUrl) {
    const where = {};
    if (opts.operatorId != null)
        where.operatorId = { _eq: opts.operatorId };
    if (opts.marketType != null)
        where.marketType = { _eq: opts.marketType.toLowerCase() };
    if (opts.creationEnabled != null)
        where.creationEnabled = { _eq: opts.creationEnabled };
    const data = await IndexerRead.gqlRequest(VenuesQuery, { where, limit: opts.limit ?? 100, offset: opts.offset ?? 0 }, indexerUrl);
    return data.Venue.map((r) => toIndexedVenue(r, "Venues"));
}
/**
 *  Server-side COUNT of venues matching a filter (Hasura `Venue_aggregate`) —
 *  so a per-operator venue list paginates against a real total instead of
 *  fetching every venue. Privileged `_aggregate` role (server-only), like
 *  {@link countOperators}.
 *
 *  Bounded by {@link IndexerRead.COUNT_FALLBACK_CAP}, like {@link countOperators};
 *  `Venue` is far below it.
 */
export async function countVenues(opts, indexerUrl, headers) {
    const where = {};
    if (opts.operatorId != null)
        where.operatorId = { _eq: opts.operatorId };
    if (opts.marketType != null)
        where.marketType = { _eq: opts.marketType.toLowerCase() };
    return IndexerRead.aggregateCount(VenueCountDocuments, where, indexerUrl, headers);
}
/** Fetch one venue by its opaque bytes32 id (null if unknown). */
export async function getVenue(venueId, indexerUrl) {
    const data = await IndexerRead.gqlRequest(VenueByPkQuery, { id: venueId.toLowerCase() }, indexerUrl);
    return data.Venue_by_pk ? toIndexedVenue(data.Venue_by_pk, "VenueByPk") : null;
}
/**
 *  Build a Hasura `where` for the operator directory. Only set fields are
 *  added — a bare `{_eq: undefined}` would collapse to IS NULL and drop rows.
 */
function operatorWhere(f) {
    const where = {};
    if (f.owner != null)
        where.owner = { _eq: f.owner.toLowerCase() };
    if (f.enabled != null)
        where.enabled = { _eq: f.enabled };
    return where;
}
// ---------------------------------------------------------------------------
// Typed documents for the reads above. Hoisted here (rather than inline at each
// call site) to keep this file's reading order: functions first, GraphQL after.
// Result and variable types are derived from the committed schema snapshot.
// prettier-ignore
const OperatorsQuery = graphql(`
  query Operators($where: Operator_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Operator(where: $where, order_by: {operatorId: desc}, limit: $limit, offset: $offset) { ...OperatorFields }
       }
`);
// prettier-ignore
const OperatorByPkQuery = graphql(`
  query OperatorByPk($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block } Operator_by_pk(id: $id) { ...OperatorFields } }
`);
// prettier-ignore
const VenuesQuery = graphql(`
  query Venues($where: Venue_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Venue(where: $where, order_by: {createdAtTimestamp: asc}, limit: $limit, offset: $offset) { ...VenueFields }
       }
`);
// prettier-ignore
const VenueByPkQuery = graphql(`
  query VenueByPk($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block } Venue_by_pk(id: $id) { ...VenueFields } }
`);
// The two count documents for `Operator` (see IndexerRead.CountDocuments).
const OperatorCountDocuments = {
    table: "Operator",
    // prettier-ignore
    aggregate: graphql(`
    query OperatorCount($where: Operator_bool_exp!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      total: Operator_aggregate(where: $where) { aggregate { count } }
    }
  `),
    // prettier-ignore
    fallback: graphql(`
    query OperatorCountFallback($where: Operator_bool_exp!, $limit: Int!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      rows: Operator(where: $where, limit: $limit) { id }
    }
  `),
};
// The two count documents for `Venue` (see IndexerRead.CountDocuments).
const VenueCountDocuments = {
    table: "Venue",
    // prettier-ignore
    aggregate: graphql(`
    query VenueCount($where: Venue_bool_exp!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      total: Venue_aggregate(where: $where) { aggregate { count } }
    }
  `),
    // prettier-ignore
    fallback: graphql(`
    query VenueCountFallback($where: Venue_bool_exp!, $limit: Int!) {
      _sdkWatermark: chain_metadata { chain_id latest_processed_block }
      rows: Venue(where: $where, limit: $limit) { id }
    }
  `),
};
