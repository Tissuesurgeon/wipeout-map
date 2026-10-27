// Perp market state — mark/index price, funding, open interest, positions.
//
// PERP-ONLY: funding rates and open interest are perp mechanics (a perpetual has
// no expiry, so funding is what tethers it to the index). `pokeFunding` is the
// keeper verb that settles the accumulated rate.
import { ChainDoesNotSupportContract } from "viem";
import { SomniaMarketsError } from "../errors.js";
import * as Errors from "../errors.js";
import { InvariantError } from "../raise.js";
import * as ReadsAbi from "../readsAbi.js";
import * as TradeAbi from "../tradeAbi.js";
import * as ActionsAbi from "../actionsAbi.js";
import * as IndexerRead from "../indexerRead.js";
import { graphql } from "../gql/gql.js";
/**
 *  The price to mark a perp position at, and whether it came from the mark feed.
 *
 *  Extracted and tested rather than written inline at the call site, because the inline
 *  version is a one-line regression waiting to happen. `getPerpState` reads the mark via
 *  `tryGetMarkPrice`, which REPORTS staleness rather than reverting on it — so the naive
 *  `markPrice - entryPrice` takes the meaningless 0 price word from a stale feed and
 *  produces a 100% loss on every open position. An earlier `getMarkPrice()` read reverted
 *  instead, which failed loudly; making the read more robust made the derived number
 *  silently worse until this guard.
 *
 *  The index price is the fallback rather than "no value": it is a separate oracle the
 *  pool already trusts for funding, and dropping positions out of a portfolio view is its
 *  own kind of wrong. Callers that want a MARK READING (rather than something to mark
 *  against) should report undefined on staleness instead — see `fetchFundingRate`.
 *
 * @category perpetual markets
 */
export function perpMarkForPnl(state) {
    // Belt and braces: a feed can report ok while still handing back 0, and a zero mark is
    // never a real price for a live perp.
    if (state.markPriceOk && state.markPrice > 0n) {
        return { price: state.markPrice, fromIndex: false };
    }
    return { price: state.indexPrice, fromIndex: true };
}
/**
 *  The ten pool reads behind {@link PerpStateOnchain}, in the order the destructure
 *  below expects.
 *
 *  `tryGetMarkPrice` rather than `getMarkPrice`: the latter REVERTS on a stale feed,
 *  which would take the whole read down with it. See {@link perpMarkForPnl}.
 */
const PERP_STATE_READS = [
    "tryGetMarkPrice",
    "getIndexPrice",
    "getCurrentFundingRate",
    "getCumulativeFundingPerUnit",
    "getProjectedCumulativeFundingPerUnit",
    "getOpenInterest",
    "getFundingParameters",
    "getLastFundingUpdateTimestampNs",
    "getEmaPremium",
    "oracle",
];
/**
 *  Read a perp pool's mark/index/funding/open-interest state AT ONE BLOCK.
 *
 *  Every field describes one instant. The fixed ten-view Multicall3 payload uses
 *  `batchSize: 0`, so client and chain settings cannot split it into several calls.
 *  A single aggregate needs no block lookup unless the chain declares a deployment
 *  height. That height needs a pin to detect a node before Multicall3 was deployed.
 *
 *  Without Multicall3, every individual read uses one sampled block. Only viem's
 *  `ChainDoesNotSupportContract` capability error permits fallback. RPC, revert and
 *  decode failures still throw through the owner's typed read boundary.
 *  An unexpected SDK failure while mapping decoded results rejects with
 *  `InvariantError` and the original failure as its cause.
 */
export async function getPerpState(pool, client) {
    const p = { address: pool, abi: ReadsAbi.perpPoolReadAbi };
    const pc = client;
    // A declared deployment height needs a head check even on the aggregate route.
    // Otherwise the bounded, unsplit aggregate itself supplies same-block atomicity.
    let blockNumber = pc.chain?.contracts?.multicall3?.blockCreated ? await pc.getBlockNumber() : undefined;
    const fanOut = async () => {
        blockNumber ??= await pc.getBlockNumber();
        const settled = await Promise.allSettled(PERP_STATE_READS.map(async (functionName) => pc.readContract({ ...p, functionName, blockNumber })));
        return settled.map((result) => {
            if (result.status === "rejected")
                throw result.reason;
            return result.value;
        });
    };
    let results;
    if (typeof pc.multicall === "function" && pc.chain?.contracts?.multicall3) {
        try {
            results = await pc.multicall({
                contracts: PERP_STATE_READS.map((functionName) => ({ ...p, functionName })),
                // A revert inside the batch must surface as a thrown SDK error, exactly as it
                // does on the readContract path — never as a silent per-call failure result.
                allowFailure: false,
                // This fixed payload is bounded. Zero overrides every configured split size.
                batchSize: 0,
                blockNumber,
            });
        }
        catch (e) {
            // Only "this chain has no usable Multicall3 here" falls back. A revert, a bad ABI
            // or a dead RPC must still throw, or a broken pool would silently cost ten reads
            // and report the same answer.
            if (!(e instanceof ChainDoesNotSupportContract))
                throw e;
            results = await fanOut();
        }
    }
    else {
        results = await fanOut();
    }
    try {
        // The cast below is unchecked, so a short batch would surface as a TypeError from the
        // middle of a destructure ("Cannot convert undefined to a BigInt") rather than as an
        // error naming the pool. Fail here instead, while there is still context.
        if (results.length !== PERP_STATE_READS.length) {
            const cause = new Error(`getPerpState(${pool}): expected ${PERP_STATE_READS.length} reads, got ${results.length}`);
            throw new InvariantError(cause.message, cause);
        }
        const [[markPriceOk, markPrice], [indexPrice, indexUpdatedAt], fundingRate, cumulative, projected, openInterest, params, lastFundingNs, emaPremium, oracle,
        // Unchecked: both paths return `unknown[]`, so this tuple is the only thing tying
        // the results back to PERP_STATE_READS. Keep the two in the same order.
        // `getFundingParameters` returns seven uint256 fields (readsAbi.ts); only the two
        // read below are named here.
        ] = results;
        const fundingWindowSec = Number(params.fundingCalculationWindowSec);
        const fundingIntervalSec = Number(params.fundingSettlementIntervalSec);
        const lastFundingUpdateAt = BigInt(lastFundingNs) / 1000000000n;
        return {
            markPrice,
            markPriceOk,
            indexPrice,
            indexUpdatedAt,
            fundingRate,
            cumulativeFundingPerUnit: cumulative,
            projectedCumulativeFundingPerUnit: projected,
            openInterest,
            fundingWindowSec,
            fundingIntervalSec,
            lastFundingUpdateAt,
            nextFundingAt: lastFundingUpdateAt + BigInt(fundingIntervalSec),
            emaPremium,
            oracle,
        };
    }
    catch (cause) {
        if (Errors.isErrorInstance(cause, SomniaMarketsError))
            throw cause;
        throw new InvariantError(`getPerpState(${pool}): could not map the decoded ten-view snapshot`, cause);
    }
}
/**
 *  Is a perp pool's mark feed live, and what is riding on it — the two reads a mark-feed
 *  MONITOR needs, and deliberately not {@link getPerpState}.
 *
 *  **Why this exists rather than reusing `getPerpState`.** That read is all-or-nothing by
 *  design: it batches with `allowFailure: false`, falls back to a `Promise.all`, and both
 *  reject whole if any leg does. One of its legs is `getIndexPrice()`, a BARE
 *  `IOracle.getPrice()` — the one index-price path the pool does not wrap in try/catch —
 *  so a dead or rotated oracle propagates its revert through the entire read. A monitor
 *  built on it therefore loses the mark verdict in exactly the situation the verdict
 *  matters most: the caller sees a failed read, not a stale feed, and a page-worthy
 *  outage degrades into "could not read this pool".
 *
 *  So the two fields that carry the verdict are read as the REQUIRED pair, and neither
 *  can revert on a dead oracle: `tryGetMarkPrice` reports staleness instead of reverting
 *  (that is the whole reason `getPerpState` moved to it), and `getOpenInterest` is a
 *  stored counter that consults no oracle. The index timestamp is then BEST EFFORT — its
 *  revert is swallowed and the field left undefined — because it is corroboration for a
 *  human, not an input to the verdict.
 *
 *  The block pin is kept for the reason {@link getPerpState} documents: the verdict and
 *  the open interest decide a SEVERITY together (a stale feed with positions open is a
 *  different incident from one without), so they must describe the same instant. The
 *  best-effort leg quotes the same block, so a reported age cannot be from a later one.
 *
 *  Three `eth_call`s plus one `eth_blockNumber`. No multicall: `allowFailure: false` is
 *  what this read exists to avoid, and batching with `allowFailure: true` would make the
 *  REQUIRED pair silently optional — the opposite of the guarantee wanted here.
 */
export async function getPerpFeedStatus(pool, client) {
    const p = { address: pool, abi: ReadsAbi.perpPoolReadAbi };
    // Pin FIRST, exactly as getPerpState does: the reads below all quote this block.
    const blockNumber = await client.getBlockNumber();
    // The verdict pair. A rejection here is a real read failure and must propagate.
    const [[markPriceOk, markPrice], openInterest] = await Promise.all([
        client.readContract({ ...p, functionName: "tryGetMarkPrice", blockNumber }),
        client.readContract({ ...p, functionName: "getOpenInterest", blockNumber }),
    ]);
    // Diagnostics. Swallowed deliberately and ONLY here - a dead oracle reverts this leg,
    // and that is the very condition the verdict above is reporting on.
    const index = await client.readContract({ ...p, functionName: "getIndexPrice", blockNumber }).catch(() => undefined);
    return { markPriceOk, markPrice, openInterest, indexUpdatedAt: index?.[1] };
}
/**
 *  Read a perp pool's funding-premium state AT ONE BLOCK.
 *
 *  **Why this is separate from {@link getPerpState}**
 *
 *  These three getters arrived with Wave 28 and do not exist on an older implementation.
 *  `getPerpState` batches with `allowFailure: false`, deliberately, so that a revert
 *  surfaces rather than hiding — which means folding these in would let one un-upgraded
 *  pool take a core read down entirely. Keeping them here contains that: a caller who
 *  wants the premium opts in, and a pool that cannot serve it fails only this call.
 *
 *  Reads fan out rather than using Multicall3. Three calls do not earn the batch, and the
 *  correctness that matters comes from the block pin rather than from batching — every
 *  field has to describe the same instant, because the accumulator, its interval start and
 *  the standing sample are only meaningful together. If this ever grows, share
 *  `getPerpState`'s batch instead of widening the fan-out.
 *
 *  **Gotchas**
 *
 *  Check `armed` before presenting `timeWeightedPremium` as an average. Until a market's
 *  first settlement after the upgrade it is the point sample, which is what the pool is
 *  charging — so the number is right, but calling it a time-weighted average is not.
 *
 * **Example** (Predicted premium, honestly labelled)
 *
 * ```ts
 * const p = await client.getPerpFundingPremium(pool);
 * const basis = p.armed ? "time-weighted" : "point sample (pre-upgrade)";
 * console.log(basis, p.timeWeightedPremium);
 * ```
 *
 * @category perpetual markets
 */
export async function getPerpFundingPremium(pool, client) {
    const p = { address: pool, abi: ReadsAbi.perpPoolReadAbi };
    // Pin FIRST, for the same reason getPerpState does: the accumulator and the interval it
    // accumulated over cannot come from different blocks and still mean anything.
    const blockNumber = await client.getBlockNumber();
    const [timeWeightedPremium, lastObservedPremium, window] = await Promise.all([
        client.readContract({ ...p, functionName: "getTimeWeightedPremium", blockNumber }),
        client.readContract({ ...p, functionName: "getLastObservedPremium", blockNumber }),
        client.readContract({ ...p, functionName: "getPremiumWindowState", blockNumber }),
    ]);
    const [accumulator, intervalStartNs, observedAtNs, validUntilNs] = window;
    return {
        timeWeightedPremium,
        lastObservedPremium,
        accumulator,
        intervalStartNs: BigInt(intervalStartNs),
        observedAtNs: BigInt(observedAtNs),
        validUntilNs: BigInt(validUntilNs),
        armed: BigInt(intervalStartNs) !== 0n,
    };
}
/** Read an account's position for one perp pool from the MarginBank. */
export async function getPerpPosition(ref, client) {
    const r = await client.readContract({
        address: ref.marginBank,
        abi: ReadsAbi.marginBankReadAbi,
        functionName: "getPosition",
        args: [ref.account, ref.pool],
    });
    return {
        size: r.size,
        avgEntryPrice: r.avgEntryPrice,
        entryFundingIndex: r.entryFundingIndex,
        lastUpdatedTimestampNs: r.lastUpdatedTimestampNs,
    };
}
// prettier-ignore
const PerpPositionsQuery = graphql(`
  query PerpPositions($where: PerpPosition_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    PerpPosition(where: $where, order_by: { updatedAt: desc }, limit: $limit, offset: $offset) {
      id
      pool
      account
      size
      isLong
      entryPriceX18
      realizedPnl
      updatedAt
      updatedAtBlock
    }
  }
`);
/**
 *  An account's perp positions across every pool, newest-updated first — ONE
 *  indexer round-trip instead of a chain read per market.
 *
 *  Indexer tier: history + aggregates, lags head slightly. For a single pool's
 *  authoritative current state — and for ANY funding-sensitive value, since the
 *  entry funding index is not on this row at all — use `client.getPerpPosition`,
 *  which returns `entryFundingIndex` from the MarginBank.
 *
 *  Deliberately selects only columns the CURRENTLY DEPLOYED indexer serves, so this
 *  read works against production today rather than waiting on the next reindex.
 *
 *  **Closed positions are excluded by default.** Rows are upserted and never
 *  deleted, so a fully-closed position lingers forever as a size-0 row; returning
 *  those would render phantom positions in every consumer. Pass `includeFlat` to
 *  get them (e.g. to show markets an account has touched).
 *
 *  **An empty array means the indexer has no rows, not that the account is flat.**
 *  A position opened moments ago may not be indexed yet; `updatedAtBlock` on each
 *  row is how far along the indexer was.
 *
 * **Details**
 *
 * - `account`: the position owner
 * - `opts.pool`: restrict to one perp pool
 * - `opts.includeFlat`: include size-0 (fully closed) rows; default false
 * - `opts.limit`: default 100
 */
export async function listPerpPositions(account, opts = {}, indexerUrl) {
    const where = { account: { _eq: account.toLowerCase() } };
    if (opts.pool != null)
        where.pool = { _eq: opts.pool.toLowerCase() };
    if (opts.includeFlat !== true)
        where.size = { _gt: "0" };
    const data = await IndexerRead.gqlRequest(PerpPositionsQuery, { where, limit: opts.limit ?? 100, offset: opts.offset ?? 0 }, indexerUrl);
    return data.PerpPosition.map((p) => ({
        id: p.id,
        pool: p.pool,
        account: p.account,
        // The entity splits magnitude from direction; the SDK's position sign convention
        // is a signed size, so fold `isLong` back in here rather than exporting both.
        size: p.isLong ? p.size : (-BigInt(p.size)).toString(),
        avgEntryPrice: p.entryPriceX18 ?? null,
        lastUpdateRealizedPnl: p.realizedPnl ?? null,
        updatedAt: p.updatedAt,
        updatedAtBlock: p.updatedAtBlock ?? null,
    }));
}
export async function pokeFunding(w, p) {
    return w.execute({
        address: p.pool,
        abi: TradeAbi.perpPoolWriteAbi,
        functionName: "updateFunding",
        args: [],
        gas: p.gas ?? w.defaultGas,
    });
}
export async function poke(w, p) {
    return w.execute({
        address: p.market,
        abi: ActionsAbi.binaryMarketWriteAbi,
        functionName: "poke",
        args: [],
        gas: p.gas ?? w.defaultGas,
    });
}
