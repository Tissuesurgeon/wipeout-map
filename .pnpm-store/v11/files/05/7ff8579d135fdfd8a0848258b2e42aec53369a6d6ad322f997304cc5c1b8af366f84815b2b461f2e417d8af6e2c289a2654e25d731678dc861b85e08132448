import * as IndexerRead from "./indexerRead.js";
/**
 *  Kinds of `RouterMinter` action the indexer records (mirror of the indexer
 *  RouterActionRecord.kind enum).
 *
 * @category routing
 */
export type RouterActionKind = "Redeem" | "MintCompleteSet" | "MergeCompleteSet";
/**
 *  One RouterMinter action for an account (mirror of the indexer
 *  `RouterActionRecord` entity). Amounts are raw collateral/outcome units.
 *
 * @category routing
 */
export type RouterActionRecord = {
    /** Record id (`${blockNumber}_${logIndex}`). */
    id: string;
    /** Redeem | MintCompleteSet | MergeCompleteSet. */
    kind: RouterActionKind;
    /** Acting wallet (lowercased). */
    account: string;
    /** Binary market id the action targeted (lowercased bytes32); null if unlinked. */
    market: string | null;
    /**
     *  Redeem: winning tokens burned; Mint/Merge: amount of EACH outcome minted /
     *  merged (a complete set). Raw outcome-token units.
     */
    amount: string;
    /** Collateral paid out (Redeem); null on Mint/Merge. Raw units. */
    payout: string | null;
    /**
     *  Periphery entry the flow routed through (NativeMint | Permit2Mint |
     *  NativeRedeem); null on a direct module call.
     */
    routedVia: string | null;
    /** Timestamp (unix seconds) of the action. */
    timestamp: string;
    /** Tx hash the action landed in. */
    txHash: string;
};
/**
 * Options for {@link SomniaMarketsClient.getRouterActions}. All optional.
 *
 * @category routing
 */
export type RouterActionsOptions = {
    /** Only actions in this market (bytes32 marketId, case-insensitive). */
    market?: string;
    /**
     *  Only actions in ANY of these markets — the batched form of `market`.
     *  Supplying both narrows to the intersection. An empty array matches nothing.
     */
    markets?: readonly string[];
    /** Only this action kind. */
    kind?: RouterActionKind;
    /** Max rows (default 50). */
    limit?: number;
    /** Row offset (default 0). */
    offset?: number;
};
/**
 *  An account's RouterMinter action history (redeem / mint / merge), newest
 *  first — optionally scoped to one market (or several via `markets`) and/or
 *  kind, paginated.
 *
 *  Mint and merge change a position's cost basis, so a PnL fold must scope this
 *  read the same way it scopes its fills: an account-wide capped read drops the
 *  OLDEST rows first, which are the ones that establish the basis.
 */
export declare function getRouterActions(account: string, opts: RouterActionsOptions | undefined, indexerUrl: IndexerRead.Source): Promise<RouterActionRecord[]>;
