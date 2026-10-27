/**
 * Spot stop-order lifecycle (mirror of the indexer StopOrderStatus enum).
 *
 * @category spot markets
 */
export type StopOrderStatus = "PENDING" | "TRIGGERED" | "TRIGGER_FAILED" | "CANCELLED";
/**
 * A pending/historical spot stop order (mirror of the indexer StopOrder entity).
 *
 * There is no limit price on this row: a spot LIMIT stop's limit price can't be read
 * back after placement. Show it as unknown, never as zero. If you need to display it,
 * keep the value you submitted.
 *
 * @category spot markets
 */
export type SpotStopOrder = {
    /** StopOrder id (`${registry}_${orderId}`). */
    id: string;
    /** SpotStopOrderRegistry the order lives on (lowercased). */
    registry: string;
    /** uint128 pending-order id as a decimal string (pass to trader.cancelStopOrder). */
    orderId: string;
    /** True = buy base (pay quote), false = sell base. */
    isBid: boolean;
    /** Base quantity, raw units. */
    quantity: string;
    /** Mark price that arms the trigger (raw quote per whole base). */
    triggerPrice: string;
    /** 0 = GTE (trigger when mark ≥ trigger), 1 = LTE (mark ≤ trigger). */
    triggerOperator: number;
    /** 0 = LIMIT, 1 = MARKET. */
    orderType: number;
    /** Lifecycle status — see {@link StopOrderStatus}. */
    status: StopOrderStatus;
    /** Resulting spot order id once successfully triggered, else null. */
    placedOrderId: string | null;
    /** Timestamp (unix seconds) the stop order was created. */
    createdAt: string;
    /** The spot market the stop order targets. */
    market: SpotPortfolioMarket;
};
/**
 *  A wallet's PENDING spot stop orders (optionally scoped to one pool/market).
 *  Used by the spot trade panel to list + cancel resting stop orders. Throws on
 *  indexer failure.
 *
 *  Rows don't include a LIMIT stop's limit price. See {@link SpotStopOrder}.
 */
export declare function getSpotStopOrders(account: string, opts: {
    pool?: string;
    status?: StopOrderStatus;
    limit?: number;
} | undefined, indexerUrl: IndexerRead.Source): Promise<SpotStopOrder[]>;
/**
 *  SOMI a SpotStopOrderRegistry charges per pending order (funds the reactivity
 *  trigger gas; refunded on cancel, consumed on trigger). Raw wei (18dp native).
 */
export declare function getStopOrderSomiPayment(registry: Address, client: PublicClient): Promise<bigint>;
import { type Address, type PublicClient } from "viem";
import * as IndexerRead from "../indexerRead.js";
import type { Writer as WriterCtx } from "../writer.js";
import type { CancelStopOrderParams, PlaceSpotStopOrderParams, PlaceStopOrderResult, TxResult } from "../trade.js";
import type { SpotPortfolioMarket } from "./portfolio.js";
export declare function placeSpotStopOrder(w: WriterCtx, p: PlaceSpotStopOrderParams): Promise<PlaceStopOrderResult>;
export declare function cancelStopOrder(w: WriterCtx, p: CancelStopOrderParams): Promise<TxResult>;
