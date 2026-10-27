// Binary settlement — resolution, redemption, and pool release.
//
// BINARY-ONLY because the machinery is: the BinarySettlement singleton, the
// ERC-6909 outcome tokens it pays out against, and the payout-numerator vector a
// market finalizes into. None of that exists for spot or perp, which is the test
// (design D1 axis two: "which contract does it hit").
//
// Settlement-extraction v2: every pool finalizes its markets INTO the permanent
// singleton and every redemption routes through it, so a pool can be recycled onto
// the next market. That is why redemption is keyed by market id (or outcome id)
// rather than by pool — a pool address alone no longer identifies a market.
import { InvalidInputError, SignerRequiredError } from "../errors.js";
import * as Boundary from "../executor/boundary.js";
import * as ActionsAbi from "../actionsAbi.js";
import * as ReadsAbi from "../readsAbi.js";
import * as TradeAbi from "../tradeAbi.js";
import * as ModuleAbi from "../moduleAbi.js";
import * as IndexerRead from "../indexerRead.js";
import * as Markets from "../markets.js";
import { graphql } from "../gql/gql.js";
import * as Writer from "../writer.js";
export async function withdrawVault(w, p) {
    if (p.amount <= 0n)
        throw new InvalidInputError("amount must be > 0");
    return w.execute({
        address: p.vault,
        abi: TradeAbi.erc20VaultWriteAbi,
        functionName: "withdraw",
        args: [p.token, p.amount],
        gas: p.gas ?? w.defaultGas,
    });
}
export async function redeem(w, p) {
    const gas = p.gas ?? w.defaultGas;
    const module = w.resolveModule(p.module);
    // The winning outcome — from the caller, or looked up via the market
    // (`market` must be set for the lookup path).
    let outcomeIdx;
    if (p.outcomeIdx !== undefined) {
        outcomeIdx = p.outcomeIdx;
    }
    else if (p.market) {
        // Settlement v3 stores a payout VECTOR (winningOutcome() was removed and
        // reverts). Establish terminal resolution before reading that vector.
        //
        // A VOID has no winner: both legs pay, so the argmax is meaningless — it
        // reports leg 0 on the uniform [D/2,D/2] vector and the higher-priced leg
        // on a CLOB_SNAPSHOT [p,D-p] one. Silently redeeming that leg strands the
        // caller's other leg (a both-legs holder gets a successful tx that claims
        // half; a single-leg holder gets a confusing InsufficientBalance from the
        // ERC-6909 transfer). Read the terminal flags first and refuse unless the
        // market is resolved. Reading the immutable vector only after that check
        // also prevents an unresolved empty vector from being mistaken for YES,
        // and prevents a market that voids during the lookup from being redeemed
        // through a guessed leg. Only the caller knows which leg they hold on a
        // void. The peer argmax in `markets.ts` disambiguates the same way.
        const [isResolved, isVoided] = await Promise.all([
            w.publicClient.readContract({
                address: p.market,
                abi: TradeAbi.binaryMarketReadAbi,
                functionName: "isResolved",
            }),
            w.publicClient.readContract({
                address: p.market,
                abi: TradeAbi.binaryMarketReadAbi,
                functionName: "isVoided",
            }),
        ]);
        if (isVoided) {
            throw new InvalidInputError("redeem cannot look up an outcome on a voided market: a void has no winner and BOTH legs (outcomeIdx 0 = YES and 1 = NO) are redeemable. Pass the leg you hold as outcomeIdx, or use redeemMany with one entry per leg to claim both in one transaction.");
        }
        if (!isResolved) {
            throw new InvalidInputError("redeem cannot look up an outcome on an unresolved market. Wait for resolution, or pass outcomeIdx only after the market has settled.");
        }
        const [vec, denominatorRaw] = await Promise.all([
            w.publicClient.readContract({
                address: p.market,
                abi: TradeAbi.binaryMarketReadAbi,
                functionName: "payoutNumerators",
            }),
            w.publicClient.readContract({
                address: p.market,
                abi: TradeAbi.binaryMarketReadAbi,
                functionName: "payoutDenominator",
            }),
        ]);
        const yes = vec[0];
        const no = vec[1];
        if (vec.length !== 2 || yes == null || no == null || denominatorRaw <= 0) {
            throw new InvalidInputError("redeem found an invalid payout vector on the resolved market");
        }
        const denominator = BigInt(denominatorRaw);
        if (yes === denominator && no === 0n)
            outcomeIdx = 0;
        else if (no === denominator && yes === 0n)
            outcomeIdx = 1;
        else
            throw new InvalidInputError("redeem found a payout vector without one resolved winner");
    }
    else {
        throw new InvalidInputError("redeem needs outcomeIdx or market to look it up");
    }
    // The MODULE pulls the winning outcome position from the caller (then routes
    // through settlement), so make the MODULE an operator on the ERC-6909
    // singleton (one grant, covers every id/market).
    const prerequisites = [];
    if (p.autoApprove !== false) {
        const outcomeToken = p.outcomeToken ??
            (p.market
                ? await w.publicClient.readContract({
                    address: p.market,
                    abi: TradeAbi.binaryMarketReadAbi,
                    functionName: "outcomeToken",
                })
                : await w.settlementOutcomeToken(w.resolveSettlement()));
        const grant = await w.operatorGrantIfNeeded(outcomeToken, module, gas);
        if (grant)
            prerequisites.push(grant);
    }
    return w.execute({
        address: module,
        abi: ModuleAbi.binaryModuleWriteAbi,
        functionName: "redeem",
        args: [p.operatorId ?? 0, p.venueId ?? Writer.ZERO_BYTES32, p.marketId, outcomeIdx, p.amount],
        gas,
    }, prerequisites);
}
export async function signRedeemAuth(w, p) {
    const module = w.resolveModule(p.module);
    const owner = p.owner ?? w.fromAddress;
    const operatorId = p.operatorId ?? 0;
    const venueId = p.venueId ?? Writer.ZERO_BYTES32;
    // EIP-712 domain + struct MUST mirror BinaryMarketsModule EXACTLY:
    //   domain: name "SomniaMarkets", version "1", the module as verifyingContract
    //           (MarketsModuleBase.__EIP712_init("SomniaMarkets", "1"));
    //   struct RedeemAuthorization: field order owner, operatorId, venueId,
    //           marketId, outcomeIdx, amount, nonce, deadline (REDEEM_AUTH_TYPEHASH).
    const domain = {
        name: "SomniaMarkets",
        version: "1",
        chainId: w.chain.id,
        verifyingContract: module,
    };
    const types = {
        RedeemAuthorization: [
            { name: "owner", type: "address" },
            { name: "operatorId", type: "uint32" },
            { name: "venueId", type: "bytes32" },
            { name: "marketId", type: "bytes32" },
            { name: "outcomeIdx", type: "uint8" },
            { name: "amount", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
        ],
    };
    const message = {
        owner,
        operatorId,
        venueId,
        marketId: p.marketId,
        outcomeIdx: p.outcomeIdx,
        amount: p.amount,
        nonce: p.nonce,
        deadline: p.deadline,
    };
    // Signing is the executor's job when it can sign as the actor (a key, a
    // wallet). A safe or a session key cannot, and this verb has no send to
    // fall back on — so it asks for a signer rather than producing nothing.
    if (!w.executor.signTypedData) {
        throw new SignerRequiredError("signRedeemAuth", "this trader's executor cannot sign typed data as the actor (a safe or a session key) — create the trader with an executor that implements signTypedData: a privateKey, a local account or a walletClient");
    }
    // viem's signTypedData ties `message` to the literal `types` map via a
    // deeply-generic conditional; passing a runtime `as const` object trips a
    // variance gap it cannot resolve, though the shape matches exactly. Fixing
    // the signature is not ours to do — this is viem's generic, not our type.
    // `signTypedData` is a plugin boundary too: a wallet's rejection or a custom
    // signer's own error is normalized here, the original kept as `cause`.
    let signature;
    try {
        signature = await w.executor.signTypedData({
            domain,
            types,
            primaryType: "RedeemAuthorization",
            message,
        });
    }
    catch (e) {
        throw Boundary.asSignTypedDataError(e);
    }
    return {
        owner,
        operatorId,
        venueId,
        marketId: p.marketId,
        outcomeIdx: p.outcomeIdx,
        amount: p.amount,
        nonce: p.nonce,
        deadline: p.deadline,
        signature,
    };
}
export async function redeemFor(w, p) {
    const module = w.resolveModule(p.module);
    const a = p.authorization;
    // Relayer submits the owner's pre-signed authorization; the module recovers
    // the signature to `owner` and pins the payout there. No operator grant is
    // needed from the relayer — the owner granted it when they held the position.
    // Arg order mirrors the on-w.chain signature:
    //   redeemFor(owner, nonce, deadline, sig, operatorId, venueId, marketId, outcomeIdx, amount).
    return w.execute({
        address: module,
        abi: ModuleAbi.binaryModuleWriteAbi,
        functionName: "redeemFor",
        args: [a.owner, a.nonce, a.deadline, a.signature, a.operatorId, a.venueId, a.marketId, a.outcomeIdx, a.amount],
        gas: p.gas ?? w.defaultGas,
    });
}
export async function redeemMany(w, p) {
    const gas = p.gas ?? w.defaultGas;
    const module = w.resolveModule(p.module);
    if (p.entries.length === 0) {
        throw new InvalidInputError("redeemMany needs at least one entry");
    }
    // One operator grant on the singleton covers every id/market.
    const prerequisites = [];
    if (p.autoApprove !== false) {
        const outcomeToken = p.outcomeToken ?? (await w.settlementOutcomeToken(w.resolveSettlement()));
        const grant = await w.operatorGrantIfNeeded(outcomeToken, module, gas);
        if (grant)
            prerequisites.push(grant);
    }
    const marketIds = p.entries.map((e) => e.marketId);
    const outcomeIdxs = p.entries.map((e) => e.outcomeIdx);
    const amounts = p.entries.map((e) => e.amount);
    return w.execute({
        address: module,
        abi: ModuleAbi.binaryModuleWriteAbi,
        functionName: "redeemMany",
        args: [p.operatorId ?? 0, p.venueId ?? Writer.ZERO_BYTES32, marketIds, outcomeIdxs, amounts],
        gas,
    }, prerequisites);
}
export async function redeemDirect(w, p) {
    const gas = p.gas ?? w.defaultGas;
    const settlement = w.resolveSettlement(p.settlement);
    const to = p.to ?? w.fromAddress;
    // Settlement burns the caller's outcome w.tokens on the ERC-6909 singleton, so
    // make the SETTLEMENT an operator (one grant covers all ids/markets).
    const prerequisites = [];
    if (p.autoApprove !== false) {
        const outcomeToken = p.outcomeToken ?? (await w.settlementOutcomeToken(settlement));
        const grant = await w.operatorGrantIfNeeded(outcomeToken, settlement, gas);
        if (grant)
            prerequisites.push(grant);
    }
    return w.execute({
        address: settlement,
        abi: ReadsAbi.binarySettlementAbi,
        functionName: "redeem",
        args: [p.outcomeId, p.amount, to],
        gas,
    }, prerequisites);
}
export async function claimOwed(w, p) {
    return w.execute({
        address: w.resolveSettlement(p.settlement),
        abi: ReadsAbi.binarySettlementAbi,
        functionName: "claimOwed",
        args: [p.token],
        gas: p.gas ?? w.defaultGas,
    });
}
export async function finalizeMarket(w, p) {
    return w.execute({
        address: w.resolveModule(p.module),
        abi: ModuleAbi.binaryModuleWriteAbi,
        functionName: "finalizeMarket",
        args: [p.marketId],
        gas: p.gas ?? w.defaultGas,
    });
}
export async function syncSettlement(w, p) {
    return w.execute({
        address: w.resolveModule(p.module),
        abi: ModuleAbi.binaryModuleWriteAbi,
        functionName: "syncSettlement",
        args: [p.marketId],
        gas: p.gas ?? w.defaultGas,
    });
}
export async function releasePool(w, p) {
    return w.execute({
        address: w.resolveModule(p.module),
        abi: ModuleAbi.binaryModuleWriteAbi,
        functionName: "releasePool",
        args: [p.marketId],
        gas: p.gas ?? w.defaultGas,
    });
}
export async function pokeOracle(w, p) {
    return w.execute({
        address: w.resolveModule(p.module),
        abi: ModuleAbi.binaryModuleWriteAbi,
        functionName: "pokeOracle",
        args: [p.oracleQuestionId],
        gas: p.gas ?? w.defaultGas,
    });
}
export async function voidExpired(w, p) {
    const client = w.publicClient;
    // Resolves the market address from the module record AND reports the live
    // lifecycle state — it throws InvalidInputError on an unknown marketId, which
    // is exactly the check this needs first. `settlementWindow` is the one thing
    // it does not read.
    const onchain = await Markets.getMarketOnchain(p.marketId, { module: w.resolveModule(p.module) }, client);
    if (!p.skipPreflight) {
        // Both on-chain guards, checked client-side so the error can name the gate
        // TIME. `SettlementWindowOpen` carries no timestamp, and "when can I
        // retry" is the question an operator actually has.
        if (onchain.isResolved || onchain.isVoided) {
            throw new InvalidInputError(`voidExpired: market ${p.marketId} is already ${onchain.isVoided ? "voided" : "resolved"} — nothing to void`);
        }
        // Compared against the CHAIN's clock, not the local one: the contract gates
        // on `block.timestamp`, so a machine whose clock runs ahead would sail past
        // this check and revert on-chain, and one running behind would refuse a
        // call that would have succeeded.
        const [window, head] = await Promise.all([
            client.readContract({
                address: onchain.marketAddress,
                abi: ReadsAbi.binaryMarketReadAbi,
                functionName: "settlementWindow",
            }),
            client.getBlock(),
        ]);
        const gate = onchain.expiry + window;
        const now = head.timestamp;
        if (now < gate) {
            throw new InvalidInputError(`voidExpired: market ${p.marketId} is still inside its settlement window — ` +
                `callable at unix ${gate} (${new Date(Number(gate) * 1000).toISOString()}), ` +
                `${gate - now}s away by the chain's clock (block ts ${now}). Try pokeOracle first.`);
        }
    }
    return w.execute({
        address: onchain.marketAddress,
        abi: ActionsAbi.binaryMarketWriteAbi,
        functionName: "voidExpired",
        args: [],
        gas: p.gas ?? w.defaultGas,
    });
}
export async function redeemNative(w, p) {
    const router = w.resolveRouter(p.router);
    // The caller must have operator-approved the router for the winning outcome
    // token beforehand (the router pulls it, redeems via the core, then unwraps
    // wNative → native to the caller). No auto-approval here.
    return w.execute({
        address: router,
        abi: TradeAbi.collateralRouterWriteAbi,
        functionName: "redeemNative",
        args: [p.operatorId, p.venueId, p.marketId, p.outcomeIdx, p.amount],
        gas: p.gas ?? w.defaultGas,
    });
}
/**
 *  Everything the indexer knows about how a market resolves: the lifecycle
 *  events, the oracle reference link, and the posted oracle answer (joined by
 *  the market's `oracleQuestionId`). Any piece may be absent (`reference`/
 *  `oracleAnswer` null; `events` []). One round-trip.
 */
export async function getMarketResolution(marketId, indexerUrl) {
    const id = marketId.toLowerCase();
    const data = await IndexerRead.gqlRequest(MarketResolutionQuery, { id }, indexerUrl);
    const reference = data.MarketReferenceLink[0] ?? null;
    // Closing = the market's own resolution question; opening = the reference
    // question (only reference-mode markets have one). Fetch both answers in ONE
    // aliased round-trip. `_by_pk(id: "")` returns null, so a missing id is safe.
    const closingQid = data.Market_by_pk?.oracleQuestionId ?? "";
    const openingQid = reference?.oracleQuestionId ?? "";
    const ans = await IndexerRead.gqlRequest(OracleAnswersQuery, { closingQid, openingQid }, indexerUrl);
    const closingAnswer = ans.closing;
    const openingAnswer = ans.opening;
    return { events: data.MarketResolutionEvent, reference, closingAnswer, openingAnswer, oracleAnswer: closingAnswer };
}
// prettier-ignore
const MarketResolutionQuery = graphql(`
  query MarketResolution($id: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         MarketResolutionEvent(where: {market_id: {_eq: $id}}, order_by: {timestamp: asc}) {
           id market: market_id kind winningOutcome: outcomeIdx payoutNumerators payoutDenominator voided blockNumber timestamp txHash
         }
         MarketReferenceLink(where: {market_id: {_eq: $id}}, limit: 1) {
           id market: market_id oracleQuestionId: referenceQuestionId pending blockNumber timestamp
         }
         Market_by_pk(id: $id) { oracleQuestionId }
       }
`);
// prettier-ignore
const OracleAnswersQuery = graphql(`
  query OracleAnswers($closingQid: String!, $openingQid: String!) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         closing: OracleAnswer_by_pk(id: $closingQid) { oracleQuestionId numericValue outcomeLabel voidReason resolvedAt txHash }
         opening: OracleAnswer_by_pk(id: $openingQid) { oracleQuestionId numericValue outcomeLabel voidReason resolvedAt txHash }
       }
`);
/**
 *  Market-resolution lifecycle events, newest first — filter by `market`,
 *  `kinds` and/or `sinceTimestamp`, paginate.
 *
 *  These rows are an append-only audit trail: one row per delivery ATTEMPT, not
 *  one row per market. A market whose answer is redelivered after a `Skipped`
 *  carries both rows, which is the point — the trail is how a responder tells a
 *  transient bad vector from a market the oracle keeps failing to settle.
 *
 *  Because the trail never clears, a caller watching for trouble wants a WINDOW
 *  (`sinceTimestamp`), not a count: `kinds: ["Skipped", "Failed"]` with no lower
 *  bound returns every failure the deployment has ever recorded.
 *
 *  @throws {@link IndexerError} The indexer request failed or returned an error.
 *   An empty page is `[]`, never an error (SDK-IO-002).
 */
export async function listMarketResolutionEvents(opts = {}, indexerUrl) {
    const where = {};
    if (opts.market != null)
        where.market_id = { _eq: opts.market.toLowerCase() };
    // NOT lowercased, unlike the id above — see MarketResolutionKind.
    if (opts.kinds != null)
        where.kind = { _in: [...opts.kinds] };
    if (opts.sinceTimestamp != null)
        where.timestamp = { _gte: String(opts.sinceTimestamp) };
    const data = await IndexerRead.gqlRequest(MarketResolutionEventsQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.MarketResolutionEvent;
}
// prettier-ignore
const MarketResolutionEventsQuery = graphql(`
  query MarketResolutionEvents($where: MarketResolutionEvent_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         MarketResolutionEvent(where: $where, order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}], limit: $limit, offset: $offset) {
           id market: market_id kind winningOutcome: outcomeIdx payoutNumerators payoutDenominator voided blockNumber timestamp txHash
         }
       }
`);
/**
 *  Reference-question links, oldest first — filter by `pending` and/or `market`,
 *  paginate.
 *
 *  Only reference-resolved markets have a link at all; a fixed-strike market has
 *  none, so this is NOT a listing of every market.
 *
 *  **Oldest first, unlike the event listings**, because the rows are a live
 *  STATE rather than a trail: `pending` is set when the market goes pending and
 *  cleared on every terminal path (resolve, void, either contract's own event),
 *  so the oldest row is the market that has been stuck longest — the one a
 *  caller sweeping this set actually wants to see first.
 *
 *  @throws {@link IndexerError} The indexer request failed or returned an error.
 *   An empty page is `[]`, never an error (SDK-IO-002).
 */
export async function listMarketReferenceLinks(opts = {}, indexerUrl) {
    const where = {};
    if (opts.pending != null)
        where.pending = { _eq: opts.pending };
    if (opts.market != null)
        where.market_id = { _eq: opts.market.toLowerCase() };
    const data = await IndexerRead.gqlRequest(MarketReferenceLinksQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.MarketReferenceLink;
}
// prettier-ignore
const MarketReferenceLinksQuery = graphql(`
  query MarketReferenceLinks($where: MarketReferenceLink_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         MarketReferenceLink(where: $where, order_by: [{timestamp: asc}, {id: asc}], limit: $limit, offset: $offset) {
           id market: market_id oracleQuestionId: referenceQuestionId pending blockNumber timestamp
         }
       }
`);
