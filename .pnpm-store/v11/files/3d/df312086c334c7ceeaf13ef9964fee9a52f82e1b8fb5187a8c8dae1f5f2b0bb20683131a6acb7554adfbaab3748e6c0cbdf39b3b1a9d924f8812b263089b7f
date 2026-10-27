import { type Address, type PublicClient } from "viem";
import type { PerpSideHoldersRef } from "./margin.js";
/**
 *  `PerpTypes.MarketStatus.Settlement`. The engine skips ADL on a pool at this
 *  status or later (Delisted is 3). ABI JSON carries no enum values, so a test pins it.
 */
export declare const PERP_MARKET_STATUS_SETTLEMENT = 2;
/**
 *  The most holders one ADL queue read fetches. A side that would be ranked but has
 *  more holders is `regime: "tooManyHolders"`, never a rank over part of the side.
 *  The scan cap on both testnet regions is 500, and `rank()` was measured there.
 *
 * @category perpetual markets
 */
export declare const PERP_ADL_QUEUE_MAX_HOLDERS = 500;
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
export type PerpAdlHolder = {
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
} | {
    /** The position is not in profit at the mark, so the engine skips it. */
    eligibility: "notInProfit";
    account: Address;
    size: bigint;
    avgEntryPrice: bigint;
    equity: bigint;
    positionNotional: bigint;
    /** `null` when `equity` is zero or less, where the ratio has no meaning. */
    positionLeverageBps: bigint | null;
} | {
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
} | {
    /**
     *  The bank cannot price the account (a market it holds has no fresh mark),
     *  so the engine skips it. Its equity is unknown, so none is given — the
     *  contract reports zeros here, and they are not real.
     */
    eligibility: "unpriceable";
    account: Address;
    size: bigint;
    avgEntryPrice: bigint;
} | {
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
export type PerpAdlQueue = {
    /** The bank has no liquidation engine wired, so there is no ADL. */
    regime: "engineUnset";
} | {
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
} | {
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
/**
 *  One side of one perp market's ADL queue at one block — see
 *  {@link PerpAdlQueueClient.getSnapshot} for the public contract. `ref` is already
 *  checked (`adlClient.ts`). Once `signal` aborts, the read sends no more calls and
 *  rejects with its reason.
 */
export declare function readPerpAdlQueue(ref: PerpSideHoldersRef, opts: ReadPerpAdlQueueOptions, client: PublicClient, signal?: AbortSignal): Promise<PerpAdlQueueRead>;
