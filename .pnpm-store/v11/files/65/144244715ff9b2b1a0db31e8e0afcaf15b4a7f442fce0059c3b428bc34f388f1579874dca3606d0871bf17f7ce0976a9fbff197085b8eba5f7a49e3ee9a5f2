// One side of one perp market's auto-deleveraging (ADL) queue, read at one block.
//
// The LiquidationEngine runs ADL as stage 6 of a liquidation that its bidders and
// the insurance fund cannot cover. It closes profitable positions on the OTHER side
// of the bankrupt's market, in the order the armed ranker contract decides. This
// module reproduces that order for a generic bankruptcy (`bankrupt = 0x0`), so a
// consumer can show a trader their place without paging, filtering or ranking
// anything itself. `adlClient.ts` serves it as `client.perpAdlQueue`, and
// `adlSession.ts` repeats it while a live view is open.
//
// Every rule here follows the engine (`LiquidationEngine.sol` on protocol main):
// which algorithm runs, who the engine considers, the tuple it hands the ranker,
// and what it does when the ranker misbehaves. The order itself is never computed
// here — it comes from the ranker's own `rank()` view, so a rotated ranker changes
// the answer without an SDK release.
import { zeroAddress } from "viem";
import { ContractRevertError, InvalidInputError, RpcError } from "../errors.js";
import * as ReadsAbi from "../readsAbi.js";
/**
 *  `PerpTypes.MarketStatus.Settlement`. The engine skips ADL on a pool at this
 *  status or later (Delisted is 3). ABI JSON carries no enum values, so a test pins it.
 */
export const PERP_MARKET_STATUS_SETTLEMENT = 2;
/** Holder states per call. A 250-holder page measured at most about 99M gas on testnet. */
const DEFAULT_PAGE_SIZE = 250;
/**
 *  The most holders one ADL queue read fetches. A side that would be ranked but has
 *  more holders is `regime: "tooManyHolders"`, never a rank over part of the side.
 *  The scan cap on both testnet regions is 500, and `rank()` was measured there.
 *
 * @category perpetual markets
 */
export const PERP_ADL_QUEUE_MAX_HOLDERS = 500;
/**
 *  Most holder pages in flight at once. One page can cost about 100M gas of node
 *  work, so this bounds the load that one read puts on a shared node, whatever
 *  `pageSize` and `maxHolders` the caller chooses.
 */
const MAX_PAGES_IN_FLIGHT = 4;
const BPS_DENOMINATOR = 10000n;
/** The options with their defaults. Throws `InvalidInputError` before any call is sent. */
function checkOptions(opts) {
    if (opts.blockNumber !== undefined && (typeof opts.blockNumber !== "bigint" || opts.blockNumber < 0n)) {
        throw new InvalidInputError("readPerpAdlQueue blockNumber must be a non-negative bigint");
    }
    const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
    const maxHolders = opts.maxHolders ?? PERP_ADL_QUEUE_MAX_HOLDERS;
    for (const [name, value] of [
        ["pageSize", pageSize],
        ["maxHolders", maxHolders],
    ]) {
        if (!Number.isSafeInteger(value) || value <= 0) {
            throw new InvalidInputError(`readPerpAdlQueue ${name} must be a positive whole number, got ${value}`);
        }
    }
    return { pageSize, maxHolders };
}
/**
 *  One `getSideHolderStatesPaginated` call at `blockNumber`: up to `count` holder states
 *  from index `start`. Every page also carries the side's length, the pool's
 *  priceability and its price snapshot, so a page of zero holders reads only those.
 */
async function readPage(client, ref, start, count, blockNumber) {
    const [states, listLength, poolPriceable, snapshot] = await client.readContract({
        address: ref.marginBank,
        abi: ReadsAbi.marginBankReadAbi,
        functionName: "getSideHolderStatesPaginated",
        args: [ref.pool, ref.isLong, start, count],
        blockNumber,
    });
    return { states, listLength, poolPriceable, snapshot };
}
/** A set of pages that cannot describe one side at one block: the node misbehaved. */
function incomplete(blockNumber, detail) {
    return new RpcError("getSideHolderStatesPaginated", `holder pages at block ${blockNumber} do not add up: ${detail}`);
}
/**
 *  The pages at `starts`, in that order, with at most {@link MAX_PAGES_IN_FLIGHT} in
 *  flight at once. Once `signal` aborts, no worker starts another page.
 */
async function readPages(client, ref, starts, pageSize, blockNumber, signal) {
    const pages = [];
    // One iterator shared by every worker, so each start is read exactly once.
    const queue = starts.entries();
    /** Reads the next start that no worker has taken, until none is left. */
    const worker = async () => {
        for (const [index, start] of queue) {
            signal?.throwIfAborted();
            pages[index] = await readPage(client, ref, start, pageSize, blockNumber);
        }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_PAGES_IN_FLIGHT, starts.length) }, worker));
    return pages;
}
/**
 *  Every holder state on the side. At ONE pinned block the bank's array cannot
 *  change between pages, so a page with another length, a short page or a holder
 *  listed twice is a node fault (SDK-ERR-006) — never a shorter queue.
 */
async function readAllStates(client, ref, holderCount, pageSize, blockNumber, signal) {
    const starts = [];
    for (let start = 0n; start < holderCount; start += pageSize)
        starts.push(start);
    const pages = await readPages(client, ref, starts, pageSize, blockNumber, signal);
    const states = [];
    const seen = new Set();
    for (const [index, page] of pages.entries()) {
        const start = BigInt(index) * pageSize;
        const remaining = holderCount - start;
        const expected = remaining < pageSize ? remaining : pageSize;
        if (page.listLength !== holderCount) {
            throw incomplete(blockNumber, `the page at ${start} reports ${page.listLength} holders, not ${holderCount}`);
        }
        if (BigInt(page.states.length) !== expected) {
            throw incomplete(blockNumber, `the page at ${start} has ${page.states.length} holders, not ${expected}`);
        }
        for (const state of page.states) {
            const key = state.account.toLowerCase();
            if (seen.has(key))
                throw incomplete(blockNumber, `${state.account} is listed twice`);
            seen.add(key);
            states.push(state);
        }
    }
    return states;
}
/**
 *  Where one holder stands. The engine's filter (`_tryBuildAdlCandidate`) skips a
 *  flat slot, a position not in profit, an unpriceable account and, on its
 *  claw-back arm, an account without equity. All four mean "skipped" on that arm,
 *  so the order of the checks only decides which reason is reported. An unpriceable account is checked before
 *  profit: the bank zeroes its health fields, and a reason past that point would
 *  report those zeros as its equity.
 */
function classify(state, markPrice, oneBase) {
    const { account, equity } = state;
    const { size, avgEntryPrice } = state.position;
    if (size === 0n)
        return { eligibility: "flat", account };
    if (!state.priceable)
        return { eligibility: "unpriceable", account, size, avgEntryPrice };
    const positionNotional = ((size < 0n ? -size : size) * markPrice) / oneBase;
    // `PerpMath.unrealizedPnl` floors toward −∞, and bigint `/` truncates toward
    // zero. The two agree on whether the result is above zero, which is all the
    // engine asks of it here.
    if (((markPrice - avgEntryPrice) * size) / oneBase <= 0n) {
        const positionLeverageBps = equity > 0n ? (positionNotional * BPS_DENOMINATOR) / equity : null;
        return { eligibility: "notInProfit", account, size, avgEntryPrice, equity, positionNotional, positionLeverageBps };
    }
    if (equity <= 0n) {
        return {
            eligibility: "noEquity",
            account,
            size,
            avgEntryPrice,
            equity,
            positionNotional,
            positionLeverageBps: null,
        };
    }
    return {
        eligibility: "candidate",
        account,
        // Set once the order is known; every candidate gets exactly one place.
        adlRank: 0,
        size,
        avgEntryPrice,
        equity,
        positionNotional,
        positionLeverageBps: (positionNotional * BPS_DENOMINATOR) / equity,
    };
}
/** `items` in the order `ordering` gives, or `null` when it is not a permutation of their indexes. */
function permute(items, ordering) {
    if (ordering.length !== items.length)
        return null;
    const seen = new Set();
    const ordered = [];
    for (const index of ordering) {
        if (index < 0n || seen.has(index))
            return null;
        const item = items[Number(index)];
        if (item === undefined)
            return null;
        seen.add(index);
        ordered.push(item);
    }
    return ordered;
}
/**
 *  The candidates in ADL order, and where that order came from. The engine calls
 *  the ranker inside `try` and, on a revert or an answer that is not a
 *  permutation, settles the candidates in holder-list order (`_identityOrdering`).
 *  This mirrors that, so a misbehaving ranker gives the order the engine would
 *  use, labelled — the deliberate containment SDK-ERR-006 asks to be documented.
 *  A failed REQUEST is not a revert: it throws.
 */
async function rankCandidates(client, ranker, engine, candidates, blockNumber) {
    let ordering;
    try {
        ordering = await client.readContract({
            address: ranker,
            abi: ReadsAbi.adlRankerReadAbi,
            functionName: "rank",
            args: [zeroAddress, candidates.map((c) => c.input)],
            // From the engine, so the call sees the `msg.sender` the engine's own call has.
            account: engine,
            blockNumber,
        });
    }
    catch (error) {
        if (error instanceof ContractRevertError)
            return { orderSource: "rankerReverted", ordered: candidates };
        throw error;
    }
    const ordered = permute(candidates, ordering);
    if (ordered === null)
        return { orderSource: "rankerInvalid", ordered: candidates };
    return { orderSource: "ranker", ordered };
}
/**
 *  One side of one perp market's ADL queue at one block — see
 *  {@link PerpAdlQueueClient.getSnapshot} for the public contract. `ref` is already
 *  checked (`adlClient.ts`). Once `signal` aborts, the read sends no more calls and
 *  rejects with its reason.
 */
export async function readPerpAdlQueue(ref, opts, client, signal) {
    const { pageSize, maxHolders } = checkOptions(opts);
    signal?.throwIfAborted();
    // Uncached. viem keeps the head for half a block time by default, and a read
    // that an event asked for must not describe a block from before that event.
    const asOfBlock = opts.blockNumber ?? (await client.getBlockNumber({ cacheTime: 0 }));
    /** The answer, at the block every call was pinned to. */
    const answer = (queue) => ({ queue, blockNumber: asOfBlock });
    signal?.throwIfAborted();
    const config = await client.readContract({
        address: ref.marginBank,
        abi: ReadsAbi.marginBankReadAbi,
        functionName: "getSystemConfig",
        blockNumber: asOfBlock,
    });
    const engine = config.liquidationEngine;
    if (engine === zeroAddress)
        return answer({ regime: "engineUnset" });
    signal?.throwIfAborted();
    // The engine's wiring is read at the same block as the holders, never cached:
    // the scan cap decides which algorithm runs, and the ranker can be rotated.
    const [ranker, scanCap, linkedWalletRegistry, marketStatus, probe] = await Promise.all([
        client.readContract({
            address: engine,
            abi: ReadsAbi.liquidationEngineReadAbi,
            functionName: "getAdlRanker",
            blockNumber: asOfBlock,
        }),
        client.readContract({
            address: engine,
            abi: ReadsAbi.liquidationEngineReadAbi,
            functionName: "getMaxAdlScanPerCall",
            blockNumber: asOfBlock,
        }),
        client.readContract({
            address: engine,
            abi: ReadsAbi.liquidationEngineReadAbi,
            functionName: "getLinkedWalletRegistry",
            blockNumber: asOfBlock,
        }),
        client.readContract({
            address: ref.pool,
            abi: ReadsAbi.perpPoolReadAbi,
            functionName: "getMarketStatus",
            blockNumber: asOfBlock,
        }),
        // ZERO holders: the side's length, the pool's priceability and its snapshot,
        // without paying for any holder's health walk before the regime is known.
        // A side that will not be ranked then costs no holder states at all.
        readPage(client, ref, 0n, 0n, asOfBlock),
    ]);
    const holderCount = probe.listLength;
    const counts = { scanCap, holderCount };
    if (ranker === zeroAddress)
        return answer({ regime: "rankerUnset", ...counts });
    if (marketStatus >= PERP_MARKET_STATUS_SETTLEMENT)
        return answer({ regime: "marketSettled", ...counts });
    // A priceable pool always has a base unit of 10^decimals; a zero one would only
    // divide by zero below, so it reads as no price at all.
    if (!probe.poolPriceable || probe.snapshot.oneBase === 0n)
        return answer({ regime: "poolUnpriceable", ...counts });
    // The engine compares the HOLDER count, before any filter, with the cap.
    if (scanCap !== 0n && holderCount > scanCap)
        return answer({ regime: "storageOrder", ...counts });
    if (holderCount > BigInt(maxHolders))
        return answer({ regime: "tooManyHolders", ...counts });
    const states = await readAllStates(client, ref, holderCount, BigInt(pageSize), asOfBlock, signal);
    // The probe's snapshot is the one every page carries: all are read at one block.
    const { markPrice, oneBase } = probe.snapshot;
    const holders = [];
    const candidates = [];
    for (const state of states) {
        const holder = classify(state, markPrice, oneBase);
        holders.push(holder);
        if (holder.eligibility !== "candidate")
            continue;
        // In holder-list order, as the engine gathers them: the ranker breaks score
        // ties by the lower index, and the engine's fallback order is this order.
        candidates.push({
            row: holder,
            input: {
                account: state.account,
                perpPool: ref.pool,
                size: state.position.size,
                entryPrice: state.position.avgEntryPrice,
                markPrice,
                accountEquity: state.equity,
            },
        });
    }
    const base = { regime: "ranked", ...counts, ranker, linkedWalletRegistry };
    if (candidates.length === 0)
        return answer({ ...base, orderSource: "ranker", holders });
    signal?.throwIfAborted();
    const { orderSource, ordered } = await rankCandidates(client, ranker, engine, candidates, asOfBlock);
    for (const [position, { row }] of ordered.entries())
        row.adlRank = position + 1;
    return answer({ ...base, orderSource, holders });
}
