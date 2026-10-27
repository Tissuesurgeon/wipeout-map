// Write + status surface for MarketCreator — the final piece of an operator's
// "market machinery". A MarketCreator (+ its policy) is stamped out of the
// MarketCreatorFactory, bound to one (operatorId, venueId, core module, oracle
// adapter) and a default order-book config. The operator then registers time-
// series under it (each Series = a rolling up/down market spec) and funds it
// with native (it pays for reactivity rolls). `triggerRoll` / reactivity params
// call the Somnia precompile (testnet/mainnet only — no-op/revert on anvil).
//
// A directory of creators/series comes from the indexer (this module's
// `listMarketCreators` / `getMarketCreator` / `listSeries`); the on-chain reads
// here (`getMarketCreatorOnchain` / `getSeriesOnchain`) are the point reads a
// wizard uses to confirm one creator's live binding / a series' live config.
import { decodeEventLog } from "viem";
import * as IndexerRead from "./indexerRead.js";
import { graphql } from "./gql/gql.js";
import { IndexerError, InvalidInputError, NotConfiguredError, RpcError } from "./errors.js";
import * as MachineryAbi from "./machineryAbi.js";
import * as MachineryWriter from "./machineryWriter.js";
const toBookTuple = (p) => ({
    tickSize: p.tickSize,
    minQuantity: p.minQuantity,
    lotSize: p.lotSize,
});
export function createMarketCreatorAdminWithDeps(config, deps) {
    const factory = deps.getConfig().addresses?.marketCreatorFactory;
    const binaryModule = deps.getConfig().addresses?.binaryModule;
    const writer = MachineryWriter.makeMachineryWriter(config, deps, "createMarketCreatorAdmin");
    const pc = () => deps.getClient();
    function requireFactory(explicit) {
        const resolved = explicit ?? factory;
        if (!resolved) {
            throw new NotConfiguredError("factory or config.addresses.marketCreatorFactory", "createMarketCreatorAdmin");
        }
        return resolved;
    }
    function resolveCore(explicit) {
        const core = explicit ?? binaryModule;
        if (!core) {
            throw new NotConfiguredError("core or config.addresses.binaryModule", "createMarketCreator");
        }
        return core;
    }
    function resolveAdapter(explicit) {
        const adapter = explicit ?? deps.getConfig().addresses?.oracleHub;
        if (!adapter) {
            throw new NotConfiguredError("adapter or config.addresses.oracleHub", "createMarketCreator");
        }
        return adapter;
    }
    function decodeCreator(receipt) {
        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: MachineryAbi.marketCreatorFactoryEventsAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "MarketCreatorCreated") {
                    return { creator: decoded.args.creator, policy: decoded.args.policy };
                }
            }
            catch {
                continue;
            }
        }
        throw new RpcError("createMarketCreator", "the receipt carried no MarketCreatorCreated event");
    }
    async function registerSeries(p) {
        return writer.execute({
            to: p.creator,
            abi: MachineryAbi.marketCreatorAbi,
            functionName: "registerSeries",
            args: [
                p.seriesId,
                {
                    collateral: p.collateral,
                    asset: p.asset,
                    numericDecimals: BigInt(p.numericDecimals),
                    intervalSec: BigInt(p.intervalSec),
                    settlementWindow: BigInt(p.settlementWindow),
                },
            ],
            gas: p.gas,
        });
    }
    return {
        async createMarketCreator(p) {
            const result = await writer.execute({
                to: requireFactory(p.factory),
                abi: MachineryAbi.marketCreatorFactoryAbi,
                functionName: "createMarketCreator",
                args: [
                    p.owner,
                    resolveCore(p.core),
                    resolveAdapter(p.adapter),
                    p.operatorId,
                    p.venueId,
                    toBookTuple(p.defaultBookParams),
                ],
                gas: p.gas,
            });
            return { ...result, ...decodeCreator(result.receipt) };
        },
        async fundMarketCreator(p) {
            return writer.execute({ to: p.creator, value: p.amountWei, gas: p.gas });
        },
        registerSeries,
        updateSeries: registerSeries,
        async triggerRoll(p) {
            return writer.execute({
                to: p.creator,
                abi: MachineryAbi.marketCreatorAbi,
                functionName: "triggerRoll",
                args: [p.seriesId],
                gas: p.gas,
            });
        },
        async recoverSeries(p) {
            return writer.execute({
                to: p.creator,
                abi: MachineryAbi.marketCreatorV2Abi,
                functionName: "recoverSeries",
                args: [p.seriesId],
                gas: p.gas,
            });
        },
        async armFirstRoll(p) {
            return writer.execute({
                to: p.creator,
                abi: MachineryAbi.marketCreatorAbi,
                functionName: "armFirstRoll",
                args: [p.seriesId, p.firesAtSec],
                gas: p.gas,
            });
        },
        async reclaimOracleCredit(p) {
            return writer.execute({
                to: p.creator,
                abi: MachineryAbi.marketCreatorAbi,
                functionName: "reclaimOracleCredit",
                args: [],
                gas: p.gas,
            });
        },
        async adoptFrom(p) {
            return writer.execute({
                to: p.successor,
                abi: MachineryAbi.marketCreatorV2Abi,
                functionName: "adoptFrom",
                args: [p.old],
                gas: p.gas,
            });
        },
        async handoffTo(p) {
            return writer.execute({
                to: p.creator,
                abi: MachineryAbi.marketCreatorV2Abi,
                functionName: "handoffTo",
                args: [p.successor],
                gas: p.gas,
            });
        },
        async swapCreator(p) {
            return writer.execute({
                to: p.policy,
                abi: MachineryAbi.marketCreatorPolicyAbi,
                functionName: "swapCreator",
                args: [p.from, p.to],
                gas: p.gas,
            });
        },
        async setReactivityGasParams(p) {
            return writer.execute({
                to: p.creator,
                abi: MachineryAbi.marketCreatorAbi,
                functionName: "setReactivityGasParams",
                args: [p.priorityFeePerGas, p.maxFeePerGas, p.gasLimit],
                gas: p.gas,
            });
        },
        async getMarketCreatorOnchain(creator) {
            const c = { address: creator, abi: MachineryAbi.marketCreatorAbi };
            const [core, adapter, operatorId, venueId, owner, book] = await Promise.all([
                pc().readContract({ ...c, functionName: "core" }),
                pc().readContract({ ...c, functionName: "adapter" }),
                pc().readContract({ ...c, functionName: "operatorId" }),
                pc().readContract({ ...c, functionName: "venueId" }),
                pc().readContract({ ...c, functionName: "owner" }),
                pc().readContract({ ...c, functionName: "defaultBookParams" }),
            ]);
            return {
                core,
                adapter,
                operatorId: Number(operatorId),
                venueId,
                owner,
                defaultBookParams: { tickSize: book[0], minQuantity: book[1], lotSize: book[2] },
            };
        },
        async getSeriesOnchain(creator, seriesId) {
            const s = (await pc().readContract({
                address: creator,
                abi: MachineryAbi.marketCreatorAbi,
                functionName: "seriesById",
                args: [seriesId],
            }));
            return {
                collateral: s[0],
                asset: s[1],
                numericDecimals: Number(s[2]),
                intervalSec: Number(s[3]),
                settlementWindow: Number(s[4]),
            };
        },
    };
}
// prettier-ignore
const SeriesFields = graphql(`
  fragment SeriesFields on Series {
    id
    creatorAddress
    seriesId
    collateral
    asset
    intervalSec
    createdAtTimestamp
    updatedAtTimestamp
  }
`);
// prettier-ignore
const MarketCreatorFields = graphql(`
  fragment MarketCreatorFields on MarketCreator {
    id
    owner
    policy
    core
    adapter
    operatorId
    venueId
    factory
    createdAtBlock
    createdAtTimestamp
  }
`);
// prettier-ignore
const OracleAdapterFields = graphql(`
  fragment OracleAdapterFields on OracleAdapter {
    id
    owner
    factory
    approved
    approvedAtTimestamp
    createdAtTimestamp
  }
`);
/**
 *  List MarketCreators, newest-first, paginated. Pass `owner` to scope to one
 *  owner's machinery (the indexed "my creators", no log scan), `operatorId` /
 *  `venueId` to scope to one operator/venue. Each row carries its nested
 *  `series`. Indexer read.
 */
export async function listMarketCreators(opts = {}, indexerUrl) {
    const data = await IndexerRead.gqlRequest(MarketCreatorsQuery, { where: marketCreatorWhere(opts), limit: opts.limit ?? 20, offset: opts.offset ?? 0 }, indexerUrl);
    return data.MarketCreator;
}
/**
 *  Fetch one MarketCreator by its address (null if unknown), with its nested
 *  `series`. Indexer read.
 */
export async function getMarketCreator(creator, indexerUrl) {
    const data = await IndexerRead.gqlRequest(MarketCreatorByPkQuery, { id: creator.toLowerCase() }, indexerUrl);
    return data.MarketCreator_by_pk;
}
/**
 *  List oracle adapters, newest-first, paginated. Pass `owner` to scope to one
 *  owner's adapters, `approved` to filter by the module-approval gate. Indexer read.
 */
export async function listOracleAdapters(opts = {}, indexerUrl) {
    const where = {};
    if (opts.owner != null)
        where.owner = { _eq: opts.owner.toLowerCase() };
    if (opts.approved != null)
        where.approved = { _eq: opts.approved };
    const data = await IndexerRead.gqlRequest(OracleAdaptersQuery, { where, limit: opts.limit ?? 20, offset: opts.offset ?? 0 }, indexerUrl);
    return data.OracleAdapter;
}
/** Fetch one oracle adapter by its address (null if unknown). Indexer read. */
export async function getOracleAdapter(adapter, indexerUrl) {
    const data = await IndexerRead.gqlRequest(OracleAdapterByPkQuery, { id: adapter.toLowerCase() }, indexerUrl);
    return data.OracleAdapter_by_pk;
}
/** List series, creation-order, optionally scoped to one creator. Indexer read. */
/**
 *  One series by its composite key `(creator, seriesId)` — seriesId is
 *  per-creator, so the pair (== entity id `${creatorLower}_${seriesId}`) names
 *  exactly one series. The row is the CURRENT spec: `registerSeries` overwrites
 *  in place (updatedAtTimestamp bumps). Null when never registered.
 */
export async function getSeries(creator, seriesId, indexerUrl) {
    const data = await IndexerRead.gqlRequest(SeriesByIdQuery, { id: `${creator.toLowerCase()}_${seriesId}` }, indexerUrl);
    return data.Series[0] ?? null;
}
export async function listSeries(opts = {}, indexerUrl) {
    const where = {};
    if (opts.creator != null)
        where.creatorAddress = { _eq: opts.creator.toLowerCase() };
    const data = await IndexerRead.gqlRequest(SeriesListQuery, { where, limit: opts.limit ?? 100, offset: opts.offset ?? 0 }, indexerUrl);
    return data.Series;
}
/**
 *  List the most recent market of every series that has rolled at least once -
 *  see {@link SeriesLatestMarket}. Indexer read, one request per page.
 *
 *  Paged with `{ limit, offset }` over the DISTINCT rows, so a page is a page
 *  of series, not of markets. Series are few - tens, not thousands - and the
 *  default page holds every series in either environment today; paginate
 *  anyway, the way every other list read here is paginated.
 *
 *  Only markets the indexer attributed to a series appear: a binary market
 *  minted outside an indexed MarketCreator carries no `series_id`, and is not
 *  what this read is for.
 */
export async function listSeriesLatestMarkets(opts = {}, indexerUrl) {
    // Validated BEFORE the request, because `??` is not a page guard (SDK-IO-005).
    // It only replaces null and undefined, and `NaN` and `Infinity` are perfectly
    // ordinary `number` values that pass it - then `JSON.stringify` turns BOTH
    // into `null`, which Hasura reads as "no limit". A caller who arrived at NaN
    // through arithmetic would silently get an UNBOUNDED result from a read whose
    // whole contract is that it is bounded. An out-of-range integer is the milder
    // half: GraphQL rejects it and the caller sees an `IndexerError` blaming the
    // indexer for what was their own input. Both become `InvalidInputError` here.
    const limit = opts.limit ?? 100;
    const offset = opts.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
        throw new InvalidInputError("Series page limit must be an integer from 1 to 1000");
    }
    if (!Number.isSafeInteger(offset) || offset < 0) {
        throw new InvalidInputError("Series page offset must be a non-negative safe integer");
    }
    const data = await IndexerRead.gqlRequest(SeriesLatestMarketsQuery, { limit, offset }, indexerUrl);
    return data.Market.map((m) => {
        // The where clause excludes a null series_id server-side, so a null here
        // means the response contradicts the query and the row is unusable.
        //
        // It THROWS rather than dropping the row (SDK-IO-002, SDK-ERR-006). Dropping
        // looks safer and is not: this read is paginated on a full-page test, so a
        // page that loses one row to a filter returns limit-1 and reads as the LAST
        // page. The caller then stops early and never sees the series after it -
        // silently, with no error and no short-read signal. For the probe's stalled-
        // series sweep that means a series nobody is watching, which is the failure
        // the sweep exists to prevent. Failure is reported as failure.
        if (m.series_id == null) {
            throw new IndexerError("SeriesLatestMarkets", `Market ${m.id} has a null series_id, which the query's where clause excludes`);
        }
        return { series: m.series_id, market: m.id, createdAtTimestamp: m.createdAtTimestamp };
    });
}
function marketCreatorWhere(f) {
    const where = {};
    if (f.owner != null)
        where.owner = { _eq: f.owner.toLowerCase() };
    if (f.operatorId != null)
        where.operatorId = { _eq: f.operatorId };
    if (f.venueId != null)
        where.venueId = { _eq: f.venueId.toLowerCase() };
    return where;
}
// prettier-ignore
const MarketCreatorsQuery = graphql(`
  query MarketCreators($where: MarketCreator_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         MarketCreator(where: $where, order_by: {createdAtBlock: desc}, limit: $limit, offset: $offset) {
           ...MarketCreatorFields
           series(order_by: {seriesId: asc}) { ...SeriesFields }
         }
       }
`);
// prettier-ignore
const MarketCreatorByPkQuery = graphql(`
  query MarketCreatorByPk($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         MarketCreator_by_pk(id: $id) {
           ...MarketCreatorFields
           series(order_by: {seriesId: asc}) { ...SeriesFields }
         }
       }
`);
// prettier-ignore
const OracleAdaptersQuery = graphql(`
  query OracleAdapters($where: OracleAdapter_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         OracleAdapter(where: $where, order_by: {createdAtTimestamp: desc}, limit: $limit, offset: $offset) { ...OracleAdapterFields }
       }
`);
// prettier-ignore
const OracleAdapterByPkQuery = graphql(`
  query OracleAdapterByPk($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block } OracleAdapter_by_pk(id: $id) { ...OracleAdapterFields } }
`);
// prettier-ignore
const SeriesByIdQuery = graphql(`
  query SeriesById($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Series(where: { id: { _eq: $id } }, limit: 1) { ...SeriesFields }
       }
`);
// prettier-ignore
const SeriesListQuery = graphql(`
  query SeriesList($where: Series_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Series(where: $where, order_by: {createdAtTimestamp: asc}, limit: $limit, offset: $offset) { ...SeriesFields }
       }
`);
// prettier-ignore
const SeriesLatestMarketsQuery = graphql(`
  query SeriesLatestMarkets($limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         Market(where: {series_id: {_is_null: false}}, distinct_on: series_id, order_by: [{series_id: asc}, {createdAtTimestamp: desc}], limit: $limit, offset: $offset) {
           id series_id createdAtTimestamp
         }
       }
`);
