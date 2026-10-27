// The OracleHub surface (Oracle v2, DESIGN §8e — EARMARK-AT-CREATION). There is
// ONE governance-approved adapter, the OracleHub: it deduplicates question
// scheduling content-addressed (same template definition → same question id,
// charged only marginal cost), EARMARKS the resolution reserve per market at
// onBind (attached with the market-creation value, LOCKED so resolution funds
// are always present, never withdrawable while the market is live), debits the
// EXACT metered resolve cost against that earmark at resolution, credits any
// surplus (`reserve − charged`) to the operator's WITHDRAWABLE credit, and
// delivers answers as payout vectors.
//
// USER-SIDE QUOTE RULE (§8e): the create-market native value is now
//   `getSchedulingCost(def) + resolveReserve()`
// — the reserve is ATTACHED to the create (forwarded to onBind and locked); there
// is NO standing prepaid balance / deposit pre-fund anymore. {@link
// quoteCreateMarketValue} returns exactly that sum (excess is refunded in-tx).
// The operator's owner can later withdraw only the accrued surplus credit
// ({@link withdrawableOf}) via credit-only `withdraw`.
//
// Reads are standalone (no signer: subject, hub, client); writes live on the
// {@link OracleHubAdmin} built via `client.createOracleHubAdmin(config)` —
// same signer doctrine as the other machinery admins (makeMachineryWriter).
import { decodeEventLog } from "viem";
import * as IndexerRead from "./indexerRead.js";
import { graphql } from "./gql/gql.js";
import { NotConfiguredError, RpcError } from "./errors.js";
import * as MachineryAbi from "./machineryAbi.js";
import * as MachineryWriter from "./machineryWriter.js";
// ---- QuestionDefinition (mirror of src/types/OracleTypes.sol) ---------------
/**
 *  `QuestionSourceType` enum values (OracleTypes.sol). Only all-JSON
 *  definitions participate in the hub's content-addressed dedup.
 *
 * @category oracles
 */
export const QUESTION_SOURCE_TYPE = {
    /** Answer scraped from a website URL. */
    Website: 0,
    /** Answer fetched from a JSON endpoint — the only source type eligible for dedup. */
    JSON: 1,
    /** Answer read from an on-chain contract. */
    Contract: 2,
};
/**
 * `AnswerType` enum values (OracleTypes.sol).
 *
 * @category oracles
 */
export const ANSWER_TYPE = {
    /** Resolves to a number, bucketed by `numericIntervals`. */
    Numeric: 0,
    /** Resolves to one of the `discreteOutcomes` strings. */
    Discrete: 1,
};
/** Shape viem expects for the definition tuple (named components). */
function toDefTuple(def) {
    return {
        questionText: def.questionText,
        sources: def.sources.map((s) => ({ sourceType: s.sourceType, params: s.params })),
        validAnswers: {
            answerType: def.validAnswers.answerType,
            discreteOutcomes: def.validAnswers.discreteOutcomes,
            numericIntervals: def.validAnswers.numericIntervals.map((i) => ({ low: i.low, high: i.high })),
            numericDecimals: def.validAnswers.numericDecimals,
        },
        resolutionTime: def.resolutionTime,
        minAgreement: def.minAgreement,
        subcommitteeSize: def.subcommitteeSize,
        subcommitteeThreshold: def.subcommitteeThreshold,
    };
}
// ---- Standalone reads (no signer; args are subject, hub, client) -----
/**
 *  The MARGINAL scheduling cost for `def` (§8c dedup pricing): 0 when the
 *  definition's canonical key is already scheduled below the bind cap (the
 *  call would dedup onto the existing question), the full oracle submission
 *  cost otherwise (new question or cap-split). Pure chain read.
 */
export async function getSchedulingCost(def, hub, client) {
    return client.readContract({
        address: hub,
        abi: MachineryAbi.oracleHubAbi,
        functionName: "getSchedulingCost",
        args: [toDefTuple(def)],
    });
}
/**
 *  Native LOCKED for an operator's outstanding (bound-but-unresolved) markets
 *  (§8e). Grows by `resolveReserve()` per market at onBind, released at
 *  resolution. NEVER withdrawable (`earmarked == outstandingOf × resolveReserve`).
 *  Pure chain read.
 */
export async function earmarkedOf(operatorId, hub, client) {
    return client.readContract({
        address: hub,
        abi: MachineryAbi.oracleHubAbi,
        functionName: "earmarkedOf",
        args: [operatorId],
    });
}
/**
 *  An operator's accrued WITHDRAWABLE surplus credit on the hub (§8e): the
 *  Σ `reserve − charged` released when resolved markets metered under their
 *  earmark. The only balance `withdraw` may draw from. Pure chain read.
 */
export async function creditOf(operatorId, hub, client) {
    return client.readContract({
        address: hub,
        abi: MachineryAbi.oracleHubAbi,
        functionName: "creditOf",
        args: [operatorId],
    });
}
/**
 *  Count of an operator's bound-but-unresolved markets (§8e). Pure chain read.
 *  `earmarkedOf == outstandingOf × resolveReserve` at every quiescent point.
 */
export async function outstandingOf(operatorId, hub, client) {
    return client.readContract({
        address: hub,
        abi: MachineryAbi.oracleHubAbi,
        functionName: "outstandingOf",
        args: [operatorId],
    });
}
/**
 *  Wei an operator's owner may withdraw right now (§8e) — equal to `creditOf`;
 *  the earmark backing live markets is never withdrawable. Pure chain read.
 */
export async function withdrawableOf(operatorId, hub, client) {
    return client.readContract({
        address: hub,
        abi: MachineryAbi.oracleHubAbi,
        functionName: "withdrawableOf",
        args: [operatorId],
    });
}
/**
 *  A1: the withdrawable surplus credited to a reserve-PAYER (`origin.creator` —
 *  an open-venue user, or the autonomous MarketCreator on its rolls) rather than
 *  the operator. That account draws it itself via `withdrawMyCredit`. Pure chain
 *  read.
 */
export async function payerCreditOf(payer, hub, client) {
    return client.readContract({
        address: hub,
        abi: MachineryAbi.oracleHubAbi,
        functionName: "payerCreditOf",
        args: [payer],
    });
}
/**
 *  A1: the account recorded as the reserve-payer for a market at onBind (the
 *  surplus recipient); zero-address once the market has settled + been swept.
 *  Pure chain read.
 */
export async function payerOf(marketId, hub, client) {
    return client.readContract({
        address: hub,
        abi: MachineryAbi.oracleHubAbi,
        functionName: "payerOf",
        args: [marketId],
    });
}
/**
 *  The per-market resolution reserve (§8e): the exact wei ATTACHED to each
 *  `onBind` (the market-creation value) and LOCKED per-market — one worst-case
 *  resolve (`perMarketResolveGas × maxFeePerGas`). Pure chain read.
 */
export async function resolveReserve(hub, client) {
    return client.readContract({
        address: hub,
        abi: MachineryAbi.oracleHubAbi,
        functionName: "resolveReserve",
    });
}
/**
 *  THE §8e user-side create-value rule:
 *  `quoteCreateMarketValue(def) = getSchedulingCost(def) + resolveReserve()`.
 *
 *  This is the exact native value to attach to
 *  `BinaryMarketsModule.scheduleAndCreateMarket` (schedule + bind in one tx):
 *  the marginal scheduling cost PLUS the resolution reserve, which is ATTACHED to
 *  the create and LOCKED per-market at onBind (earmark-at-creation — there is NO
 *  standing prepaid pre-fund anymore). For `createMarket` against an
 *  ALREADY-scheduled question the scheduling cost is 0, so the value is just the
 *  reserve. Quote fresh per create — the scheduling cost is marginal (drops to 0
 *  once the question exists). Excess is refunded in-tx.
 */
export async function quoteCreateMarketValue(def, hub, client) {
    const [cost, reserve] = await Promise.all([getSchedulingCost(def, hub, client), resolveReserve(hub, client)]);
    return cost + reserve;
}
export function createOracleHubAdminWithDeps(config, deps) {
    const hub = deps.getConfig().addresses?.oracleHub;
    const binaryModule = deps.getConfig().addresses?.binaryModule;
    const writer = MachineryWriter.makeMachineryWriter(config, deps, "createOracleHubAdmin");
    const pc = () => deps.getClient();
    function requireHub() {
        if (!hub) {
            throw new NotConfiguredError("config.addresses.oracleHub", "createOracleHubAdmin");
        }
        return hub;
    }
    function requireModule() {
        if (!binaryModule) {
            throw new NotConfiguredError("config.addresses.binaryModule", "hub-approval reads");
        }
        return binaryModule;
    }
    function decodeScheduled(receipt) {
        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: MachineryAbi.oracleHubEventsAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "QuestionScheduled") {
                    return { oracleQuestionId: decoded.args.oracleQuestionId, reused: false };
                }
                if (decoded.eventName === "QuestionReused") {
                    return { oracleQuestionId: decoded.args.oracleQuestionId, reused: true };
                }
            }
            catch {
                continue;
            }
        }
        throw new RpcError("scheduleQuestion", "the receipt carried no QuestionScheduled/QuestionReused event");
    }
    async function isHubApproved() {
        return await pc().readContract({
            address: requireModule(),
            abi: MachineryAbi.moduleGovernanceAbi,
            functionName: "approvedAdapters",
            args: [requireHub()],
        });
    }
    return {
        getSchedulingCost: (def) => getSchedulingCost(def, requireHub(), pc()),
        earmarkedOf: (operatorId) => earmarkedOf(operatorId, requireHub(), pc()),
        creditOf: (operatorId) => creditOf(operatorId, requireHub(), pc()),
        outstandingOf: (operatorId) => outstandingOf(operatorId, requireHub(), pc()),
        withdrawableOf: (operatorId) => withdrawableOf(operatorId, requireHub(), pc()),
        payerCreditOf: (payer) => payerCreditOf(payer, requireHub(), pc()),
        payerOf: (marketId) => payerOf(marketId, requireHub(), pc()),
        resolveReserve: () => resolveReserve(requireHub(), pc()),
        quoteCreateMarketValue: (def) => quoteCreateMarketValue(def, requireHub(), pc()),
        async getQuestionState(def) {
            const a = { address: requireHub(), abi: MachineryAbi.oracleHubAbi };
            const questionKey = await pc().readContract({
                ...a,
                functionName: "questionKeyOf",
                args: [toDefTuple(def)],
            });
            const oracleQuestionId = await pc().readContract({
                ...a,
                functionName: "questionIdByKey",
                args: [questionKey],
            });
            if (oracleQuestionId === 0n) {
                return { questionKey, oracleQuestionId, bindCount: 0, markets: [] };
            }
            const [bindCount, markets] = await Promise.all([
                pc().readContract({ ...a, functionName: "bindCount", args: [oracleQuestionId] }),
                pc().readContract({ ...a, functionName: "marketsForQuestion", args: [oracleQuestionId] }),
            ]);
            return { questionKey, oracleQuestionId, bindCount: Number(bindCount), markets: [...markets] };
        },
        async getQuestionIdByKey(questionKey) {
            return pc().readContract({
                address: requireHub(),
                abi: MachineryAbi.oracleHubAbi,
                functionName: "questionIdByKey",
                args: [questionKey],
            });
        },
        async getBindCount(oracleQuestionId) {
            const count = await pc().readContract({
                address: requireHub(),
                abi: MachineryAbi.oracleHubAbi,
                functionName: "bindCount",
                args: [oracleQuestionId],
            });
            return Number(count);
        },
        async getMarketsForQuestion(oracleQuestionId) {
            const markets = await pc().readContract({
                address: requireHub(),
                abi: MachineryAbi.oracleHubAbi,
                functionName: "marketsForQuestion",
                args: [oracleQuestionId],
            });
            return [...markets];
        },
        isHubApproved,
        async getHubStatus() {
            const address = requireHub();
            const a = { address, abi: MachineryAbi.oracleHubAbi };
            const [owner, balanceWei, approved, subscriptionId, priorityFeePerGas, maxFeePerGas, gasLimit, perMarketResolveGas, callbackBaseGas, maxResolvesPerCallback, resolveGasReserve, resolveReserveWei, pendingResolves,] = await Promise.all([
                pc().readContract({ ...a, functionName: "owner" }),
                pc().getBalance({ address }),
                isHubApproved(),
                pc().readContract({ ...a, functionName: "subscriptionId" }),
                pc().readContract({ ...a, functionName: "priorityFeePerGas" }),
                pc().readContract({ ...a, functionName: "maxFeePerGas" }),
                pc().readContract({ ...a, functionName: "gasLimit" }),
                pc().readContract({ ...a, functionName: "perMarketResolveGas" }),
                pc().readContract({ ...a, functionName: "callbackBaseGas" }),
                pc().readContract({ ...a, functionName: "maxResolvesPerCallback" }),
                pc().readContract({ ...a, functionName: "resolveGasReserve" }),
                pc().readContract({ ...a, functionName: "resolveReserve" }),
                pc().readContract({ ...a, functionName: "pendingResolves" }),
            ]);
            return {
                owner,
                balanceWei,
                approved,
                subscriptionId,
                priorityFeePerGas: BigInt(priorityFeePerGas),
                maxFeePerGas: BigInt(maxFeePerGas),
                gasLimit: BigInt(gasLimit),
                perMarketResolveGas: BigInt(perMarketResolveGas),
                callbackBaseGas: BigInt(callbackBaseGas),
                maxResolvesPerCallback: BigInt(maxResolvesPerCallback),
                resolveGasReserve: BigInt(resolveGasReserve),
                resolveReserveWei,
                pendingResolves,
            };
        },
        async scheduleQuestion(p) {
            const address = requireHub();
            const value = p.valueWei ?? (await getSchedulingCost(p.def, address, pc()));
            const result = await writer.execute({
                to: address,
                abi: MachineryAbi.oracleHubAbi,
                functionName: "scheduleQuestion",
                args: [toDefTuple(p.def)],
                value,
                gas: p.gas,
            });
            return { ...result, ...decodeScheduled(result.receipt) };
        },
        async withdraw(p) {
            return writer.execute({
                to: requireHub(),
                abi: MachineryAbi.oracleHubAbi,
                functionName: "withdraw",
                args: [p.operatorId, p.amountWei, p.to],
                gas: p.gas,
            });
        },
        async withdrawMyCredit(p) {
            return writer.execute({
                to: requireHub(),
                abi: MachineryAbi.oracleHubAbi,
                functionName: "withdrawMyCredit",
                args: [p.amountWei, p.to],
                gas: p.gas,
            });
        },
        async fundHub(p) {
            return writer.execute({ to: requireHub(), value: p.amountWei, gas: p.gas });
        },
        async setGasParams(p) {
            return writer.execute({
                to: requireHub(),
                abi: MachineryAbi.oracleHubAbi,
                functionName: "setGasParams",
                args: [p.priorityFeePerGas, p.maxFeePerGas, p.gasLimit],
                gas: p.gas,
            });
        },
        async setDrainParams(p) {
            return writer.execute({
                to: requireHub(),
                abi: MachineryAbi.oracleHubAbi,
                functionName: "setDrainParams",
                args: [p.perMarketResolveGas, p.callbackBaseGas, p.maxResolvesPerCallback, p.resolveGasReserve],
                gas: p.gas,
            });
        },
        async enableReactivity(p) {
            return writer.execute({
                to: requireHub(),
                abi: MachineryAbi.oracleHubAbi,
                functionName: "enableReactivity",
                args: [],
                gas: p?.gas,
            });
        },
        async migrateSubscription(p) {
            return writer.execute({
                to: requireHub(),
                abi: MachineryAbi.oracleHubAbi,
                functionName: "migrateSubscription",
                args: [],
                gas: p?.gas,
            });
        },
    };
}
// prettier-ignore
const OracleQuestionFields = graphql(`
  fragment OracleQuestionFields on OracleQuestion {
    id
    questionKey
    scheduler
    oracleCost
    bindCount
    reuseCount
    createdAtBlock
    createdAtTimestamp
  }
`);
// prettier-ignore
const OperatorHubAccountFields = graphql(`
  fragment OperatorHubAccountFields on OperatorHubAccount {
    id
    operatorId
    earmarked
    credit
    outstanding
    createdAtBlock
    createdAtTimestamp
    updatedAtBlock
    updatedAtTimestamp
  }
`);
// prettier-ignore
const OracleBindFields = graphql(`
  fragment OracleBindFields on OracleBind {
    id
    oracleQuestionId
    bindIndex
    operatorId
    measuredGas
    overheadShare
    cost
    charged
    subsidy
    resolvedAt
    boundAtBlock
    boundAtTimestamp
    txHash
  }
`);
// prettier-ignore
const OracleCallbackFields = graphql(`
  fragment OracleCallbackFields on OracleCallback {
    id
    marketsResolved
    gasPrice
    measuredGas
    overheadGasAttributed
    totalCost
    totalCharged
    subsidy
    pendingRemaining
    blockNumber
    timestamp
    txHash
  }
`);
/** One hub-scheduled question by its oracleQuestionId, or null. Indexer read. */
export async function getOracleQuestion(oracleQuestionId, indexerUrl) {
    const data = await IndexerRead.gqlRequest(OracleQuestionQuery, { id: String(oracleQuestionId) }, indexerUrl);
    return data.OracleQuestion_by_pk;
}
/**
 *  Hub-scheduled questions, newest first — filter by `scheduler` and/or
 *  `questionKey`, paginate. Indexer read.
 */
export async function listOracleQuestions(opts = {}, indexerUrl) {
    const where = {};
    if (opts.scheduler != null)
        where.scheduler = { _eq: opts.scheduler.toLowerCase() };
    if (opts.questionKey != null)
        where.questionKey = { _eq: opts.questionKey.toLowerCase() };
    const data = await IndexerRead.gqlRequest(OracleQuestionsQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.OracleQuestion;
}
/**
 *  One operator's hub account (earmarked / credit / outstanding) by operatorId,
 *  or null. Indexer read.
 */
export async function getOperatorHubAccount(operatorId, indexerUrl) {
    const data = await IndexerRead.gqlRequest(OperatorHubAccountQuery, { id: String(operatorId) }, indexerUrl);
    return data.OperatorHubAccount_by_pk;
}
/**
 *  Operator hub-account records, most-recently-updated first, paginated.
 *  Indexer read.
 */
export async function listOperatorHubAccounts(opts = {}, indexerUrl) {
    const data = await IndexerRead.gqlRequest(OperatorHubAccountsQuery, { limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.OperatorHubAccount;
}
/**
 *  Bind records, newest first — filter by `operatorId` (an operator's bound
 *  markets + their exact resolve charges) and/or `oracleQuestionId`, optionally
 *  scope to `resolved` binds (`resolvedAt != null`), paginate. Oracle v2 §8e:
 *  no escrow — resolved rows carry the exact metered charge + subsidy. Indexer
 *  read.
 */
export async function listOracleBinds(opts = {}, indexerUrl) {
    const where = {};
    if (opts.operatorId != null)
        where.operatorId = { _eq: opts.operatorId };
    if (opts.oracleQuestionId != null)
        where.oracleQuestionId = { _eq: String(opts.oracleQuestionId) };
    if (opts.resolved != null)
        where.resolvedAt = opts.resolved ? { _is_null: false } : { _is_null: true };
    const data = await IndexerRead.gqlRequest(OracleBindsQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.OracleBind;
}
/**
 *  Resolution-callback conservation records, newest first, paginated. The audit
 *  trail an off-chain verifier reconciles the hub's exact-metering invariants
 *  against (a callback drains across many questions, so there is no
 *  per-question filter). Indexer read.
 */
export async function listOracleCallbacks(opts = {}, indexerUrl) {
    const data = await IndexerRead.gqlRequest(OracleCallbacksQuery, { limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.OracleCallback;
}
// prettier-ignore
const OracleQuestionQuery = graphql(`
  query OracleQuestion($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         OracleQuestion_by_pk(id: $id) { ...OracleQuestionFields }
       }
`);
// prettier-ignore
const OracleQuestionsQuery = graphql(`
  query OracleQuestions($where: OracleQuestion_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         OracleQuestion(where: $where, order_by: {createdAtTimestamp: desc}, limit: $limit, offset: $offset) { ...OracleQuestionFields }
       }
`);
// prettier-ignore
const OperatorHubAccountQuery = graphql(`
  query OperatorHubAccount($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         OperatorHubAccount_by_pk(id: $id) { ...OperatorHubAccountFields }
       }
`);
// prettier-ignore
const OperatorHubAccountsQuery = graphql(`
  query OperatorHubAccounts($limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         OperatorHubAccount(order_by: {updatedAtTimestamp: desc}, limit: $limit, offset: $offset) { ...OperatorHubAccountFields }
       }
`);
// prettier-ignore
const OracleBindsQuery = graphql(`
  query OracleBinds($where: OracleBind_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         OracleBind(where: $where, order_by: {boundAtTimestamp: desc}, limit: $limit, offset: $offset) { ...OracleBindFields }
       }
`);
// prettier-ignore
const OracleCallbacksQuery = graphql(`
  query OracleCallbacks($limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         OracleCallback(order_by: {timestamp: desc}, limit: $limit, offset: $offset) { ...OracleCallbackFields }
       }
`);
