// Spot stop orders — trigger-price orders held off-book.
//
// SPOT-ONLY because the machinery is: a SpotStopOrderRegistry contract holds the
// resting stop, and an operator approval (granted once, globally, via the shared
// OperatorPermissionsRegistry) lets it place the real order through the pool when
// the trigger fires. Binary and perp have no such registry.
//
// The SOMI payment read belongs here too — it is the keeper fee this registry
// charges, not a protocol-wide fee.

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

/** Stop-order columns, shared by {@link getSpotPortfolio} and {@link getSpotStopOrders}. */
// prettier-ignore
const SpotStopOrderFields = graphql(`
  fragment SpotStopOrderFields on StopOrder {
    id
    registry
    orderId: orderIdRaw
    isBid
    quantity
    triggerPrice
    triggerOperator
    orderType
    status
    placedOrderId
    createdAt
  }
`);

/**
 *  A wallet's PENDING spot stop orders (optionally scoped to one pool/market).
 *  Used by the spot trade panel to list + cancel resting stop orders. Throws on
 *  indexer failure.
 *
 *  Rows don't include a LIMIT stop's limit price. See {@link SpotStopOrder}.
 */
export async function getSpotStopOrders(
  account: string,
  opts: { pool?: string; status?: StopOrderStatus; limit?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<SpotStopOrder[]> {
  // Default to PENDING (working stops); pass status to see TRIGGERED /
  // TRIGGER_FAILED / CANCELLED history.
  const where: Record<string, unknown> = {
    owner: { _eq: account.toLowerCase() },
    status: { _eq: opts.status ?? "PENDING" },
  };
  // Scoped by pool only, as before: StopOrder is shared with perps and the unified
  // fetchOpenStopOrders() reads every pending stop through here. See pools.ts, "type
  // scope, as pools", for the shape. Polled every 4s on a spot pool page.
  Object.assign(where, await Pools.marketScope({ pool: opts.pool }, indexerUrl));
  const data = await IndexerRead.gqlRequest(SpotStopOrdersQuery, { where, limit: opts.limit ?? 200 }, indexerUrl);
  return IndexerRead.narrowIndexerInvariant<SpotStopOrder>(data.StopOrder);
}

// prettier-ignore
const SpotStopOrdersQuery = graphql(`
  query SpotStopOrders($where: StopOrder_bool_exp!, $limit: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    StopOrder(where: $where, order_by: { createdAt: desc }, limit: $limit) {
      ...SpotStopOrderFields
      market {
        ...SpotPortfolioMarketFields
      }
    }
  }
`);

/**
 *  SOMI a SpotStopOrderRegistry charges per pending order (funds the reactivity
 *  trigger gas; refunded on cancel, consumed on trigger). Raw wei (18dp native).
 */
export async function getStopOrderSomiPayment(registry: Address, client: PublicClient): Promise<bigint> {
  return client.readContract({
    address: registry,
    abi: ReadsAbi.spotStopRegistryReadAbi,
    functionName: "somiPaymentPerOrder",
  });
}

import { decodeEventLog, type Address, type PublicClient } from "viem";
import * as IndexerRead from "../indexerRead.js";
import * as Pools from "../pools.js";
import { graphql } from "../gql/gql.js";
import { InvalidInputError } from "../errors.js";
import * as TradeAbi from "../tradeAbi.js";
import * as ReadsAbi from "../readsAbi.js";
import * as PoolReads from "./poolReads.js";
import * as Writer from "../writer.js";
import type { Writer as WriterCtx } from "../writer.js";
import type { CancelStopOrderParams, PlaceSpotStopOrderParams, PlaceStopOrderResult, TxResult } from "../trade.js";
import type { SpotPortfolioMarket } from "./portfolio.js";

// IOrderBook.placeOrderFor selector — the capability a stop order's owner must
// operator-approve the registry for, so the registry can place the order at trigger.
// Re-homed to ./operatorGrants, which owns the grant surface and asserts the value
// against the function signature; imported rather than copied so the two cannot drift.
import { PLACE_ORDER_FOR_SELECTOR, setOperatorApprovalGlobal } from "./operatorGrants.js";

export async function placeSpotStopOrder(w: WriterCtx, p: PlaceSpotStopOrderParams): Promise<PlaceStopOrderResult> {
  if (p.quantity <= 0n || p.triggerPrice <= 0n) {
    throw new InvalidInputError("quantity and triggerPrice must be > 0");
  }
  if (p.stopOrderType === 0 && (p.limitPrice ?? 0n) <= 0n) {
    throw new InvalidInputError("a LIMIT stop order needs limitPrice > 0");
  }
  const gas = p.gas ?? w.defaultGas;
  const somi =
    p.somiPayment ??
    (await w.publicClient.readContract({
      address: p.registry,
      abi: TradeAbi.spotStopRegistryWriteAbi,
      functionName: "somiPaymentPerOrder",
    }));

  // The registry places the order at trigger via pool.placeOrderFor in auto-pull
  // mode. That requires (1) a one-time operator approval of the registry, and
  // (2) w.escrow the pool can pull — an ERC-20 allowance, or (native base sell) a
  // vault pre-load funded here as part of msg.value. Without these the trigger
  // reverts and the SOMI is consumed.
  if (p.skipOperatorApproval !== true) {
    const authorized = await PoolReads.isOperatorAuthorized(
      { pool: p.pool, owner: w.fromAddress, operator: p.registry, selector: PLACE_ORDER_FOR_SELECTOR },
      w.publicClient,
    );
    if (!authorized) {
      // Resolve once here purely to NAME the operation: a missing registry address
      // should say "a stop order", not "an operator grant". The write below then
      // resolves the raw override itself, as any other caller's would.
      w.resolveOperatorRegistry(p.operatorRegistry, "a stop order");
      // One code path with the public grant surface — see ./operatorGrants.
      await setOperatorApprovalGlobal(w, {
        operator: p.registry,
        selectors: [PLACE_ORDER_FOR_SELECTOR],
        approved: true,
        operatorRegistry: p.operatorRegistry,
        gas,
      });
    }
  }

  // Escrow: the input is quote on a buy, base on a sell. Read the pool's exact
  // worst-case auto-pull requirement (and native vault shortfall) so the approval
  // threshold and the native pre-load value match the contract.
  const price = p.stopOrderType === 0 ? (p.limitPrice ?? 0n) : p.triggerPrice;
  const { requiredAmount, delta } = await PoolReads.getAutoPullRequirement(
    { pool: p.pool, owner: w.fromAddress, isBid: p.isBid, price, quantity: p.quantity },
    w.publicClient,
  );

  const prerequisites: Writer.Prerequisite[] = [];
  let value = somi;
  const nativeSell = !p.isBid && p.baseIsNative === true;
  if (nativeSell) {
    // Native-base sell: the pool can't auto-pull native at trigger (callback runs
    // with msg.value == 0), so the shortfall is pre-loaded into the owner's vault
    // now. The registry requires msg.value == somiPayment + delta exactly.
    value = somi + delta;
  } else if (p.autoApprove !== false) {
    const inputToken = p.isBid ? p.quoteToken : p.baseToken;
    const approval = await w.approvalIfNeeded(inputToken, p.pool, requiredAmount, gas);
    if (approval) prerequisites.push(approval);
  }

  const result = await w.execute(
    {
      address: p.registry,
      abi: TradeAbi.spotStopRegistryWriteAbi,
      functionName: "createPendingOrder",
      args: [
        {
          order: { isBid: p.isBid, owner: w.fromAddress, userData: 0n, quantity: p.quantity },
          orderType: p.stopOrderType,
          triggerPrice: p.triggerPrice,
          triggerOperator: p.triggerOperator,
          limitPrice: p.limitPrice ?? 0n,
          builder: Writer.ZERO_ADDRESS,
          builderFeeBpsTimes1k: 0n,
        },
      ],
      gas,
      value,
    },
    prerequisites,
  );

  // The registry id only surfaces through PendingOrderCreated — the
  // function's return value is unreadable from a receipt.
  let stopOrderId: bigint | undefined;
  for (const log of result.receipt.logs) {
    // Only the registry's own logs — another contract in the tx could
    // emit a signature-identical event.
    if (log.address.toLowerCase() !== p.registry.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: TradeAbi.spotStopRegistryEventsAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "PendingOrderCreated") {
        stopOrderId = decoded.args.orderId;
        break;
      }
    } catch {
      // Not a registry event — skip.
    }
  }
  return { ...result, stopOrderId };
}

export async function cancelStopOrder(w: WriterCtx, p: CancelStopOrderParams): Promise<TxResult> {
  return w.execute({
    address: p.registry,
    abi: TradeAbi.spotStopRegistryWriteAbi,
    functionName: "cancelPendingOrder",
    args: [BigInt(p.orderId)],
    gas: p.gas ?? w.defaultGas,
  });
}
