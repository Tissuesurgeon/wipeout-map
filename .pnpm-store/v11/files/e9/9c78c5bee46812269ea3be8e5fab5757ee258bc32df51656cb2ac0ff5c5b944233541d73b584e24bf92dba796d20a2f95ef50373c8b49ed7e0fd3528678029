import * as IndexerRead from "../indexerRead.js";
import type { Writer as WriterCtx } from "../writer.js";
import type { ClaimOwedParams, FinalizeMarketParams, PokeOracleParams, RedeemAuthorization, RedeemDirectParams, RedeemForParams, RedeemManyParams, RedeemNativeParams, RedeemParams, ReleasePoolParams, SignRedeemAuthParams, SyncSettlementParams, TxResult, VoidExpiredParams, WithdrawVaultParams } from "../trade.js";
export declare function withdrawVault(w: WriterCtx, p: WithdrawVaultParams): Promise<TxResult>;
export declare function redeem(w: WriterCtx, p: RedeemParams): Promise<TxResult>;
export declare function signRedeemAuth(w: WriterCtx, p: SignRedeemAuthParams): Promise<RedeemAuthorization>;
export declare function redeemFor(w: WriterCtx, p: RedeemForParams): Promise<TxResult>;
export declare function redeemMany(w: WriterCtx, p: RedeemManyParams): Promise<TxResult>;
export declare function redeemDirect(w: WriterCtx, p: RedeemDirectParams): Promise<TxResult>;
export declare function claimOwed(w: WriterCtx, p: ClaimOwedParams): Promise<TxResult>;
export declare function finalizeMarket(w: WriterCtx, p: FinalizeMarketParams): Promise<TxResult>;
export declare function syncSettlement(w: WriterCtx, p: SyncSettlementParams): Promise<TxResult>;
export declare function releasePool(w: WriterCtx, p: ReleasePoolParams): Promise<TxResult>;
export declare function pokeOracle(w: WriterCtx, p: PokeOracleParams): Promise<TxResult>;
export declare function voidExpired(w: WriterCtx, p: VoidExpiredParams): Promise<TxResult>;
export declare function redeemNative(w: WriterCtx, p: RedeemNativeParams): Promise<TxResult>;
/**
 *  One market-resolution lifecycle event (mirror of the indexer
 *  `MarketResolutionEvent` entity). Oracle v2: resolution is delivered as a
 *  payout VECTOR (`MarketResolved(marketId, qid, payoutDenominator,
 *  payoutNumerators, voided)`); `winningOutcome` stays as the binary-compat
 *  derivation of a one-hot vector.
 *
 * @category binary markets
 */
export type MarketResolutionEvent = {
    /** Event id (`${blockNumber}_${logIndex}`). */
    id: string;
    /** Market id (lowercased bytes32). */
    market: string;
    /** Resolution kind, e.g. "Resolved" | "Skipped" | "Failed" (indexer-defined). */
    kind: string;
    /**
     *  Winning outcome (0 = YES, 1 = NO), derived from a one-hot payout vector;
     *  null on void / skip / non-one-hot vectors.
     */
    winningOutcome: number | null;
    /**
     *  Per-outcome payout numerators delivered with the event (decimal strings;
     *  raw Σ == payoutDenominator). Null on events indexed before the vector wire
     *  / kinds that carry none.
     */
    payoutNumerators?: string[] | null;
    /**
     *  Vector denominator (`PAYOUT_VECTOR_DENOMINATOR` = 10_000_000; decimal
     *  string). Null when no vector was carried.
     */
    payoutDenominator?: string | null;
    /** True when the market was voided (uniform vector) rather than resolved. */
    voided?: boolean | null;
    /** Block the event landed in (decimal string). */
    blockNumber: string;
    /** Timestamp (unix seconds) of the event. */
    timestamp: string;
    /** Tx hash the event landed in. */
    txHash: string;
};
/**
 *  The oracle reference a market binds to (mirror of the indexer
 *  `MarketReferenceLink` entity).
 *
 * @category binary markets
 */
export type MarketReferenceLink = {
    /** Entity id (== the lowercased marketId). */
    id: string;
    /** Market id (lowercased bytes32). */
    market: string;
    /** Reference question id the market resolves against (decimal string). */
    oracleQuestionId: string;
    /**
     *  True once the market has its own answer but the reference question is not
     *  yet final (resolution still pending on the reference).
     */
    pending: boolean;
    /** Block of the most recent write to this link (decimal string). */
    blockNumber: string;
    /**
     *  Timestamp (unix seconds) of the most recent write to this link. While
     *  `pending` is true this is when the market went pending, so it is the age
     *  of the stall rather than the age of the link.
     */
    timestamp: string;
};
/**
 *  The numeric answer the oracle posted for a question (mirror of the indexer
 *  `OracleAnswer` entity).
 *
 * @category binary markets
 */
export type OracleAnswer = {
    /** oracleQuestionId (decimal string == entity id). */
    oracleQuestionId: string;
    /** Numeric answer the oracle posted (raw; interpretation is question-specific). */
    numericValue: string | null;
    /** Human outcome label the oracle posted, if any. */
    outcomeLabel: string | null;
    /** Void reason code (non-null only on a voided answer). */
    voidReason: number | null;
    /** Timestamp (unix seconds) the answer was posted; null until posted. */
    resolvedAt: string | null;
    /** Tx hash the answer was posted in; null until posted. */
    txHash: string | null;
};
/**
 *  Everything the indexer knows about how a market resolves: the lifecycle
 *  events, the oracle reference link, and the posted oracle answer (joined by
 *  the market's `oracleQuestionId`). Any piece may be absent (`reference`/
 *  `oracleAnswer` null; `events` []). One round-trip.
 */
export declare function getMarketResolution(marketId: string, indexerUrl: IndexerRead.Source): Promise<{
    /** Resolution lifecycle events (Resolved/Skipped/Failed), oldest first; [] if none yet. */
    events: MarketResolutionEvent[];
    /** The reference-question link; null on fixed-strike (non-reference) markets. */
    reference: MarketReferenceLink | null;
    /**
     *  Oracle answer to the market's OWN resolution question. For a reference-mode
     *  up/down market this is the CLOSING price the outcome was decided on.
     */
    closingAnswer: OracleAnswer | null;
    /**
     *  Oracle answer to the REFERENCE question — the OPENING price the market
     *  resolves against ("closes at or above its opening price"). `null` for
     *  fixed-strike markets (no reference question).
     */
    openingAnswer: OracleAnswer | null;
    /**
     * Compatibility alias for {@link closingAnswer}.
     *
     * @deprecated Use {@link closingAnswer} instead.
     */
    oracleAnswer: OracleAnswer | null;
}>;
/**
 *  The `kind` discriminator on {@link MarketResolutionEvent}, as a union — the
 *  three outcomes `BinaryMarketsModule` can record for one delivery attempt.
 *
 *  `Resolved` is the success. The other two both leave the market UNRESOLVED
 *  with no on-chain retry: `Skipped` is an answer the market could not consume
 *  (wrong denominator, wrong vector length, or a raw sum that differs from the
 *  denominator), and `Failed` is a per-market `resolve` / `voidMarket` call that
 *  reverted inside the module's fan-out over one oracle question.
 *
 *  Used as the FILTER type on {@link ListMarketResolutionEventsOptions.kinds}
 *  rather than on the row, deliberately. {@link MarketResolutionEvent.kind}
 *  stays a `string` because it mirrors an indexer-defined column and narrowing
 *  a value callers already read would break them for no gain. The filter is
 *  where a typo is dangerous: it is matched exactly and never lowercased, so
 *  `"skipped"` would match nothing and the empty page would read as "no market
 *  failed to resolve" — the reading this exists to make impossible.
 *
 * @category binary markets
 */
export type MarketResolutionKind = "Resolved" | "Skipped" | "Failed";
/**
 *  Filters and pagination for
 *  {@link SomniaMarketsClient.listMarketResolutionEvents | client.listMarketResolutionEvents}.
 *
 *  Named rather than inline because this shape is declared twice — here and on
 *  the client member — and SDK-TYPE-005 exists so the two cannot drift.
 *
 * @category binary markets
 */
export interface ListMarketResolutionEventsOptions {
    /** Market id (lowercased bytes32). Case-insensitive: lowercased before the query. */
    market?: string;
    /**
     *  Kinds to return, matched with `_in`. Omitted returns every kind.
     *
     *  Matched EXACTLY and NOT lowercased — it is the indexer's own discriminator.
     *  See {@link MarketResolutionKind} for why this is a union and the row field
     *  is not.
     */
    kinds?: readonly MarketResolutionKind[];
    /**
     *  Lower bound on `timestamp`, unix SECONDS, inclusive (`_gte`). Executes at
     *  the indexer against an indexed column, so a caller watching a rolling
     *  window pays for the window rather than over-fetching newest-first and
     *  discarding the tail.
     */
    sinceTimestamp?: number;
    /** Rows per page. Defaults to 50. */
    limit?: number;
    /**
     *  Rows to skip. Defaults to 0.
     *
     *  The query carries a TOTAL order (`timestamp`, then `blockNumber`, then the
     *  `id` primary key), so the sequence is STABLE between requests. That fixes
     *  tie ordering; it does NOT make offset paging snapshot-consistent against a
     *  table the indexer is still writing to. Narrow with `sinceTimestamp` and
     *  raise `limit` when completeness matters more than a tidy page.
     */
    offset?: number;
}
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
export declare function listMarketResolutionEvents(opts: ListMarketResolutionEventsOptions | undefined, indexerUrl: IndexerRead.Source): Promise<MarketResolutionEvent[]>;
/**
 *  Filters and pagination for
 *  {@link SomniaMarketsClient.listMarketReferenceLinks | client.listMarketReferenceLinks}.
 *
 * @category binary markets
 */
export interface ListMarketReferenceLinksOptions {
    /**
     *  Restrict to links whose resolution is (or is not) waiting on the reference
     *  question. `true` is the interesting set: a market that has its own oracle
     *  answer while the question it resolves AGAINST is not final yet. Omitted
     *  returns both.
     */
    pending?: boolean;
    /** Market id (lowercased bytes32). Case-insensitive: lowercased before the query. */
    market?: string;
    /** Rows per page. Defaults to 50. */
    limit?: number;
    /** Rows to skip. Defaults to 0. Ordered by `timestamp` then the `id` primary key. */
    offset?: number;
}
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
export declare function listMarketReferenceLinks(opts: ListMarketReferenceLinksOptions | undefined, indexerUrl: IndexerRead.Source): Promise<MarketReferenceLink[]>;
