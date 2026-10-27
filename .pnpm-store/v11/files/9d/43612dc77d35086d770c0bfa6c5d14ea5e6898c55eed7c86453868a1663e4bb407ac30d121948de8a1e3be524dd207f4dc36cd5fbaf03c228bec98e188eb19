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

import { zeroAddress, type Address, type PublicClient } from "viem";
import { ContractRevertError, InvalidInputError, RpcError } from "../errors.js";
import * as ReadsAbi from "../readsAbi.js";
import type { PerpSideHoldersRef } from "./margin.js";

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

const BPS_DENOMINATOR = 10_000n;

/** How the read runs. Internal: the client always reads at the head, with the defaults. */
export interface ReadPerpAdlQueueOptions {
  /** Read at this block instead of the uncached head. */
  blockNumber?: bigint;
  /**
   *  Holder states fetched per contract call. Each holder costs its account's
   *  health walk, which measured 0.2–0.4M gas per holder on testnet. At most four
   *  calls are in flight at once.
   *
   *  @default 250
   */
  pageSize?: number;
  /** @default {@link PERP_ADL_QUEUE_MAX_HOLDERS} */
  maxHolders?: number;
}

/** One read's answer: the queue, and the block every call was pinned to. */
export interface PerpAdlQueueRead {
  readonly queue: PerpAdlQueue;
  readonly blockNumber: bigint;
}

/**
 *  Where the order of a ranked side's candidates came from.
 *
 *  - `ranker`: the armed ranker returned a valid order. Also the value when no
 *    holder is a candidate: there is nothing to order, and the ranker is not called.
 *  - `rankerReverted`: the ranker reverted. The engine catches that and settles
 *    the candidates in holder-list order, so that is the order given.
 *  - `rankerInvalid`: the ranker returned something that is not a permutation of
 *    the candidates. The engine refuses it and uses holder-list order, as here.
 *
 * @category perpetual markets
 */
export type PerpAdlOrderSource = "ranker" | "rankerReverted" | "rankerInvalid";

/**
 *  One holder on the side, and where it stands in the ADL queue. Narrow on
 *  `eligibility`; only a `candidate` has a place.
 *
 *  Amounts are raw: `size` in base units (positive long, negative short), prices
 *  in quote units per whole base, `equity` and `positionNotional` in collateral
 *  units.
 *
 * @category perpetual markets
 */
export type PerpAdlHolder =
  | {
      /** In profit at the mark, priceable, with positive equity: the engine would close it. */
      eligibility: "candidate";
      account: Address;
      /** 1-based place in the ADL order. 1 is closed first. */
      adlRank: number;
      size: bigint;
      avgEntryPrice: bigint;
      /** The account's cross-margin equity, as the engine hands it to the ranker. */
      equity: bigint;
      /** `|size| × mark / oneBase`. */
      positionNotional: bigint;
      /**
       *  `positionNotional` over `equity`, bps, with the same meaning as
       *  `PerpLeverage.positionLeverageBps`. The ranker scores a leverage factor close
       *  to this one, not equal: it also takes out deposits made in the same second,
       *  and a link-aware ranker nets linked wallets.
       */
      positionLeverageBps: bigint;
    }
  | {
      /** The position is not in profit at the mark, so the engine skips it. */
      eligibility: "notInProfit";
      account: Address;
      size: bigint;
      avgEntryPrice: bigint;
      equity: bigint;
      positionNotional: bigint;
      /** `null` when `equity` is zero or less, where the ratio has no meaning. */
      positionLeverageBps: bigint | null;
    }
  | {
      /**
       *  In profit, but the account has no equity left to give up. The engine's
       *  claw-back arm, which this read follows, skips it. Its burn arm does not check
       *  equity, and its ranker would put such a holder first: see the Gotchas of
       *  `client.perpAdlQueue.getSnapshot`.
       */
      eligibility: "noEquity";
      account: Address;
      size: bigint;
      avgEntryPrice: bigint;
      /** Zero or less. */
      equity: bigint;
      positionNotional: bigint;
      /** Always `null`: with no equity, the ratio has no meaning. */
      positionLeverageBps: null;
    }
  | {
      /**
       *  The bank cannot price the account (a market it holds has no fresh mark),
       *  so the engine skips it. Its equity is unknown, so none is given — the
       *  contract reports zeros here, and they are not real.
       */
      eligibility: "unpriceable";
      account: Address;
      size: bigint;
      avgEntryPrice: bigint;
    }
  | {
      /** A holder slot with no position on this side. */
      eligibility: "flat";
      account: Address;
    };

/**
 *  One side of one perp market's ADL queue at one block. Narrow on `regime`. The
 *  block is the view's `data.blockNumber`.
 *
 *  Only `ranked` lists holders. Every other regime is an answer about the whole
 *  side: no ADL would rank it, or the read declined to.
 *
 * @category perpetual markets
 */
export type PerpAdlQueue =
  | {
      /** The bank has no liquidation engine wired, so there is no ADL. */
      regime: "engineUnset";
    }
  | {
      /**
       *  - `rankerUnset`: the engine has no ranker, so ADL cannot run (`AdlRankerNotSet`).
       *  - `marketSettled`: the market is at Settlement or later; the engine skips its ADL.
       *  - `poolUnpriceable`: the pool has no fresh mark price; an ADL here would revert.
       *  - `storageOrder`: the side has more holders than `scanCap`, so the engine walks
       *    them in storage order and never calls the ranker. That walk depends on the
       *    bankrupt account's size, so no per-holder order is given.
       *  - `tooManyHolders`: the side would be ranked, but has more holders than
       *    {@link PERP_ADL_QUEUE_MAX_HOLDERS}.
       */
      regime: "rankerUnset" | "marketSettled" | "poolUnpriceable" | "storageOrder" | "tooManyHolders";
      /** `LiquidationEngine.getMaxAdlScanPerCall()`; `0n` means unbounded. */
      scanCap: bigint;
      /** Holders on the side, before any filter. */
      holderCount: bigint;
    }
  | {
      /** The engine would rank this side. */
      regime: "ranked";
      scanCap: bigint;
      holderCount: bigint;
      /** The armed ranker that ordered the candidates. */
      ranker: Address;
      /**
       *  The engine's linked-wallet registry. While it is non-zero, a link-aware
       *  ranker nets linked wallets, and a real bankrupt's own group is sorted last.
       */
      linkedWalletRegistry: Address;
      orderSource: PerpAdlOrderSource;
      /** Every holder on the side, in the bank's holder-list order. */
      holders: PerpAdlHolder[];
    };

type CandidateRow = Extract<PerpAdlHolder, { eligibility: "candidate" }>;

/** The ranker's input for one candidate, in `IAdlRanker.Candidate` field order. */
interface RankerCandidate {
  account: Address;
  perpPool: Address;
  size: bigint;
  entryPrice: bigint;
  markPrice: bigint;
  accountEquity: bigint;
}

/** The parts of one `SideHolderState` the queue reads. */
interface HolderState {
  account: Address;
  priceable: boolean;
  equity: bigint;
  position: { size: bigint; avgEntryPrice: bigint };
}

/** One `getSideHolderStatesPaginated` answer. */
interface HolderPage {
  states: readonly HolderState[];
  listLength: bigint;
  poolPriceable: boolean;
  snapshot: { oneBase: bigint; markPrice: bigint };
}

/** The options with their defaults. Throws `InvalidInputError` before any call is sent. */
function checkOptions(opts: ReadPerpAdlQueueOptions): { pageSize: number; maxHolders: number } {
  if (opts.blockNumber !== undefined && (typeof opts.blockNumber !== "bigint" || opts.blockNumber < 0n)) {
    throw new InvalidInputError("readPerpAdlQueue blockNumber must be a non-negative bigint");
  }
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxHolders = opts.maxHolders ?? PERP_ADL_QUEUE_MAX_HOLDERS;
  for (const [name, value] of [
    ["pageSize", pageSize],
    ["maxHolders", maxHolders],
  ] as const) {
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
async function readPage(
  client: PublicClient,
  ref: PerpSideHoldersRef,
  start: bigint,
  count: bigint,
  blockNumber: bigint,
): Promise<HolderPage> {
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
function incomplete(blockNumber: bigint, detail: string): RpcError {
  return new RpcError("getSideHolderStatesPaginated", `holder pages at block ${blockNumber} do not add up: ${detail}`);
}

/**
 *  The pages at `starts`, in that order, with at most {@link MAX_PAGES_IN_FLIGHT} in
 *  flight at once. Once `signal` aborts, no worker starts another page.
 */
async function readPages(
  client: PublicClient,
  ref: PerpSideHoldersRef,
  starts: readonly bigint[],
  pageSize: bigint,
  blockNumber: bigint,
  signal: AbortSignal | undefined,
): Promise<HolderPage[]> {
  const pages: HolderPage[] = [];
  // One iterator shared by every worker, so each start is read exactly once.
  const queue = starts.entries();
  /** Reads the next start that no worker has taken, until none is left. */
  const worker = async (): Promise<void> => {
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
async function readAllStates(
  client: PublicClient,
  ref: PerpSideHoldersRef,
  holderCount: bigint,
  pageSize: bigint,
  blockNumber: bigint,
  signal: AbortSignal | undefined,
): Promise<HolderState[]> {
  const starts: bigint[] = [];
  for (let start = 0n; start < holderCount; start += pageSize) starts.push(start);
  const pages = await readPages(client, ref, starts, pageSize, blockNumber, signal);

  const states: HolderState[] = [];
  const seen = new Set<string>();
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
      if (seen.has(key)) throw incomplete(blockNumber, `${state.account} is listed twice`);
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
function classify(state: HolderState, markPrice: bigint, oneBase: bigint): PerpAdlHolder {
  const { account, equity } = state;
  const { size, avgEntryPrice } = state.position;
  if (size === 0n) return { eligibility: "flat", account };
  if (!state.priceable) return { eligibility: "unpriceable", account, size, avgEntryPrice };
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
function permute<T>(items: readonly T[], ordering: readonly bigint[]): T[] | null {
  if (ordering.length !== items.length) return null;
  const seen = new Set<bigint>();
  const ordered: T[] = [];
  for (const index of ordering) {
    if (index < 0n || seen.has(index)) return null;
    const item = items[Number(index)];
    if (item === undefined) return null;
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
async function rankCandidates(
  client: PublicClient,
  ranker: Address,
  engine: Address,
  candidates: readonly { row: CandidateRow; input: RankerCandidate }[],
  blockNumber: bigint,
): Promise<{ orderSource: PerpAdlOrderSource; ordered: readonly { row: CandidateRow }[] }> {
  let ordering: readonly bigint[];
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
  } catch (error: unknown) {
    if (error instanceof ContractRevertError) return { orderSource: "rankerReverted", ordered: candidates };
    throw error;
  }
  const ordered = permute(candidates, ordering);
  if (ordered === null) return { orderSource: "rankerInvalid", ordered: candidates };
  return { orderSource: "ranker", ordered };
}

/**
 *  One side of one perp market's ADL queue at one block — see
 *  {@link PerpAdlQueueClient.getSnapshot} for the public contract. `ref` is already
 *  checked (`adlClient.ts`). Once `signal` aborts, the read sends no more calls and
 *  rejects with its reason.
 */
export async function readPerpAdlQueue(
  ref: PerpSideHoldersRef,
  opts: ReadPerpAdlQueueOptions,
  client: PublicClient,
  signal?: AbortSignal,
): Promise<PerpAdlQueueRead> {
  const { pageSize, maxHolders } = checkOptions(opts);
  signal?.throwIfAborted();
  // Uncached. viem keeps the head for half a block time by default, and a read
  // that an event asked for must not describe a block from before that event.
  const asOfBlock = opts.blockNumber ?? (await client.getBlockNumber({ cacheTime: 0 }));
  /** The answer, at the block every call was pinned to. */
  const answer = (queue: PerpAdlQueue): PerpAdlQueueRead => ({ queue, blockNumber: asOfBlock });

  signal?.throwIfAborted();
  const config = await client.readContract({
    address: ref.marginBank,
    abi: ReadsAbi.marginBankReadAbi,
    functionName: "getSystemConfig",
    blockNumber: asOfBlock,
  });
  const engine = config.liquidationEngine;
  if (engine === zeroAddress) return answer({ regime: "engineUnset" });

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
  if (ranker === zeroAddress) return answer({ regime: "rankerUnset", ...counts });
  if (marketStatus >= PERP_MARKET_STATUS_SETTLEMENT) return answer({ regime: "marketSettled", ...counts });
  // A priceable pool always has a base unit of 10^decimals; a zero one would only
  // divide by zero below, so it reads as no price at all.
  if (!probe.poolPriceable || probe.snapshot.oneBase === 0n) return answer({ regime: "poolUnpriceable", ...counts });
  // The engine compares the HOLDER count, before any filter, with the cap.
  if (scanCap !== 0n && holderCount > scanCap) return answer({ regime: "storageOrder", ...counts });
  if (holderCount > BigInt(maxHolders)) return answer({ regime: "tooManyHolders", ...counts });

  const states = await readAllStates(client, ref, holderCount, BigInt(pageSize), asOfBlock, signal);
  // The probe's snapshot is the one every page carries: all are read at one block.
  const { markPrice, oneBase } = probe.snapshot;
  const holders: PerpAdlHolder[] = [];
  const candidates: { row: CandidateRow; input: RankerCandidate }[] = [];
  for (const state of states) {
    const holder = classify(state, markPrice, oneBase);
    holders.push(holder);
    if (holder.eligibility !== "candidate") continue;
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

  const base = { regime: "ranked" as const, ...counts, ranker, linkedWalletRegistry };
  if (candidates.length === 0) return answer({ ...base, orderSource: "ranker", holders });
  signal?.throwIfAborted();
  const { orderSource, ordered } = await rankCandidates(client, ranker, engine, candidates, asOfBlock);
  for (const [position, { row }] of ordered.entries()) row.adlRank = position + 1;
  return answer({ ...base, orderSource, holders });
}
