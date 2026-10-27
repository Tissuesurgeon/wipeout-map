import * as Errors from "../errors.js";
// Perp stop orders — the take-profit / stop-loss plane.
//
// PERP-ONLY. Both tiers live here: the indexer LISTING (what stops do I have) and the
// chain WRITES + a per-order chain read.
//
// LISTING IS STILL INDEXER-ONLY, and not by preference. The registry exposes no
// per-owner or count getter — `allPendingOrders` is private, and `hasOrdersFor` is a
// PerpPool view about RESTING book orders, not a registry one. So nothing on chain
// answers "what stops do I have", and a creation the indexer missed is invisible.
//
// The registry DID gain a per-ORDER getter (`getPendingOrder`), which closes two gaps
// this file used to record as permanent. A LIMIT stop's `limitPrice` is now readable,
// where before it was passed in calldata, kept in private storage, and carried by no
// event — so nothing off-chain could show the limit a trader chose. Same for a linked
// pair's `siblingOrderId` and an order's `intent`. All three need the id first, so
// they enrich a listing rather than replace it.
//
// The LISTING surfaces all three — pairing, intent, and a cancellation cause. It could
// not always, and the reason was a deployment one rather than a design one, which is
// worth keeping written down because the same constraint governs the next such column.
// The indexer gained them by subscribing four more registry events, and that is an envio
// CONFIG change: the running indexer refuses to resume onto it, so the columns only
// existed after a from-scratch reindex and a slot cutover. Selecting a column Hasura does
// not serve is a VALIDATION error, not a null — it fails the whole request rather than
// nulling three fields — so shipping this read alongside its own columns would have taken
// `listPerpStopOrders` down for every caller, on every scope, for as long as the reindex
// took. It therefore shipped one release BEHIND them, after the cutover landed (#433).
//
// `getPerpStopOrder` stays the per-order chain read. It remains the only way to see a
// LIMIT stop's `limitPrice` — no event carries it, so nothing off-chain can — and it
// still answers during a reindex or an indexer outage, which is exactly when a listing
// cannot. What it is no longer needed FOR is pairing and intent: one chain read per
// order was the per-order cost these listing columns exist to remove.
//
// One gap the listing closed with no SDK change at all: `LinkedOrderCancelled` is the
// only signal that a pair's surviving leg was torn down after its sibling filled
// (`_cancelSiblingOnFill` does not also emit `PendingOrderCancelled`), so before it was
// subscribed a listing reported that leg as `PENDING` forever. Subscribing it moves the
// row to `CANCELLED` — and `cancelReason` is what tells that apart from the owner having
// cancelled it, which matters because the two refund the SOMI differently.

import {
  ChainDoesNotSupportContract,
  decodeEventLog,
  type Address,
  type Hex,
  type PublicClient,
  type ReadContractReturnType,
} from "viem";
import * as IndexerRead from "../indexerRead.js";
import * as Pools from "../pools.js";
import { graphql } from "../gql/gql.js";
import { ContractRevertError, InvalidInputError, NotConfiguredError, RpcError } from "../errors.js";
import * as Revert from "../revert.js";
import type { SomniaMarketsSocketFailure } from "../config.js";

import { InvariantError } from "../raise.js";
import * as TradeAbi from "../tradeAbi.js";
import * as Writer from "../writer.js";
import type { Writer as WriterCtx } from "../writer.js";
import type {
  CancelPerpStopOrdersParams,
  ClaimPerpStopSomiParams,
  CancelStopOrderParams,
  LinkPerpStopOrdersParams,
  PerpStopIntent,
  PerpStopOrderLeg,
  PlacePerpStopOrderParams,
  PlacePerpStopOrderResult,
  TxResult,
} from "../trade.js";
import type { StopOrderStatus } from "../spot/stops.js";

/**
 *  Why a triggered stop placed nothing. Mirrors the registry's `DropReason` enum.
 *
 *  The distinction matters for what a UI should say. `ReduceOnly*` are ordinary
 *  outcomes of a stop that events overtook — the position was already closed, or
 *  flipped, or what remained was dust — while `PlacementFailed` is a real rejection.
 *  Collapsing them all to "failed" makes routine behaviour look broken.
 *
 * @category perpetual markets
 */
export const PERP_STOP_DROP_REASON = [
  "None",
  "ReduceOnlyNoPosition",
  "ReduceOnlyWrongSide",
  "ReduceOnlyBelowMinQty",
  "PlacementFailed",
  // Appended by the registry; every earlier member keeps its index, so already-indexed
  // rows are unaffected. Separates a placement the pool ACCEPTED but that traded
  // nothing from one it rejected outright — the pool decides an IOC's fate on a dry
  // run, and the real run can fill less, including zero, when it pulls a maker the dry
  // run had counted. Previously reported as a success, which concealed it.
  "NoFill",
] as const;

/**
 * A drop reason, decoded from the on-chain enum index.
 *
 * @category perpetual markets
 */
export type PerpStopDropReason = (typeof PERP_STOP_DROP_REASON)[number];

/**
 * The perp market a stop order targets.
 *
 * @category perpetual markets
 */
export type PerpStopOrderMarket = {
  /** Pool address (lowercased; == the market id for perp). */
  poolAddress: string;
  /** Synthetic-base symbol (e.g. "WBTC"); null when the wrapper exposes none. */
  baseSymbol: string | null;
  /** Collateral token symbol; null when the token exposes none. */
  quoteSymbol: string | null;
  /** Base-token decimals — format quantities with this. */
  baseDecimals: number;
  /** Collateral decimals — format the trigger price with this. */
  quoteDecimals: number;
};

/**
 * One take-profit / stop-loss order on a perp market.
 *
 * Rows from `listPerpStopOrders` don't include `limitPrice`. Fetch it for live stops
 * with `getPerpStopOrders`.
 *
 * @category perpetual markets
 */
export type PerpStopOrder = {
  /** Row id (`${registry}_${orderId}`). */
  id: string;
  /** The PerpStopOrderRegistry holding it (lowercased). */
  registry: string;
  /** uint128 registry OrderId as a decimal string — pass to `trader.cancelStopOrder`. */
  orderIdRaw: string;
  /** The order's owner (lowercased). */
  owner: string;
  /** True = the triggered order buys, false = sells. */
  isBid: boolean;
  /** Quantity in raw base units. */
  quantity: string;
  /** The MARK price at which it fires, raw quote units per whole base. */
  triggerPrice: string;
  /**
   *  Which way the mark must cross `triggerPrice` to fire: `0` = GTE (fires at or
   *  above), `1` = LTE (fires at or below). This, not the side, is what makes a stop a
   *  take-profit or a stop-loss.
   */
  triggerOperator: number;
  /** `0` = LIMIT, `1` = MARKET — the type of order placed when it fires. */
  orderType: number;
  /** Builder tagged on the resulting order (lowercased); zero address for none. */
  builder: string;
  /**
   *  The builder fee the triggered order will charge, in bps x 1000 — so `1500` is
   *  1.5bps, not 1500bps. `"0"` when no builder is tagged.
   *
   *  Only knowable from the creation event: the registry deletes a pending order on
   *  every fire, so after a trigger nothing on chain can say what fee was agreed.
   */
  builderFeeBpsTimes1k: string;
  /** Lifecycle state — see {@link StopOrderStatus}. */
  status: StopOrderStatus;
  /** The PerpPool order id created on a successful trigger; null otherwise. */
  placedOrderId: string | null;
  /**
   *  Why a trigger placed nothing, decoded — null on a pending or successful order.
   *
   *  Read it before calling a `TRIGGER_FAILED` order a failure: a reduce-only drop
   *  means the stop was overtaken by events (position already closed, flipped, or
   *  below minimum), which is ordinary. Only `PlacementFailed` is a rejection. SOMI is
   *  consumed on every fire regardless of outcome.
   */
  dropReason: PerpStopDropReason | null;
  /**
   *  The LIVE OCO sibling's registry id, as a decimal string — null when this stop is
   *  unlinked, and null on every terminal row.
   *
   *  Live is the whole contract, which is why every terminal write clears it. A pair's
   *  two rows leave at different times, so a pointer surviving on a departed row names an
   *  order whose own state has moved on: a client acting on "cancel the pair" would tear
   *  down a stop the trader deliberately kept armed.
   *
   *  A leg that fires WITHOUT filling leaves its partner live and unlinked (back to
   *  null) — that is what lets the survivor be re-paired.
   *
   *  Provenance is deliberately not here. Which leg retired this one is
   *  {@link PerpStopOrder.cancelReason}'s job; overloading one column with "my live
   *  partner" and "the leg that retired me" is what would make a client act on the wrong
   *  one.
   */
  siblingOrderId: string | null;
  /**
   *  Whether the triggered order may only REDUCE the owner's position (`"reduceOnly"` —
   *  a take-profit / stop-loss) or may open and increase one (`"opening"` — a
   *  stop-entry / breakout, gated on initial margin at creation).
   *
   *  `null` means the registry reported a member this SDK version does not know, and it
   *  is deliberately not folded into `"reduceOnly"`: calling an unknown member reduce-only
   *  would promise a caller that an order cannot increase their position when a newer
   *  member might let it. Treat null as "upgrade the SDK before acting on this".
   */
  intent: PerpStopIntent | null;
  /**
   *  WHY this stop reached `CANCELLED` — `"Owner"`, `"LinkedFill"` or `"Inert"`. Null on
   *  every row that is not cancelled.
   *
   *  All three end the same way for the trader — the order is no longer working — but
   *  they are three different stories and **two different refunds**, so a UI that renders
   *  CANCELLED as "you cancelled this, SOMI refunded to your wallet" is wrong for two of
   *  them:
   *
   *  - `"Owner"` — the owner cancelled it, and the SOMI is pushed back to them in that
   *    same transaction.
   *  - `"LinkedFill"` — the protocol retired it because its OCO sibling FILLED.
   *  - `"Inert"` — a keeper swept it after the registry's Schedule chain wound down.
   *
   *  The last two only CREDIT `unclaimedSomi`; the trader recovers it via `claimSomi()`.
   *
   *  A raw string rather than a decoded union, matching `Order.cancelReason`. The
   *  vocabulary is the indexer's own — three distinct events, not a contract enum
   *  arriving as a uint8 — so there is nothing to decode, and a value this SDK version
   *  has not heard of should reach a consumer intact rather than become null.
   */
  cancelReason: string | null;
  /** Timestamp (unix seconds) the stop was created. */
  createdAt: string;
  /** Timestamp (unix seconds) of the last state change. */
  updatedAt: string;
  /** Tx hash the stop was created in. */
  txHash: string;
  /** The perp market it targets. */
  market: PerpStopOrderMarket;
};

// `id` is a TIEBREAKER, not a second sort anyone asked for. `createdAt` is a block
// timestamp, so two stops created in the same block share one — and this is the stop read
// that pages with `offset`, where a tie makes the boundary between two pages undefined:
// the same row can come back on both pages, or on neither. `id` is unique, so adding it
// pins a total order. Cheap to serve: the composite index it sorts under ends with `id`
// for exactly this.
// prettier-ignore
const PerpStopOrdersQuery = graphql(`
  query PerpStopOrders($where: StopOrder_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
    StopOrder(where: $where, order_by: [{ createdAt: desc }, { id: desc }], limit: $limit, offset: $offset) {
      id
      registry
      orderIdRaw
      owner
      isBid
      quantity
      triggerPrice
      triggerOperator
      orderType
      builder
      builderFeeBpsTimes1k
      status
      placedOrderId
      dropReason
      siblingOrderId
      intent
      cancelReason
      createdAt
      updatedAt
      txHash
      market {
        poolAddress
        baseSymbol
        quoteSymbol
        baseDecimals
        quoteDecimals
      }
    }
  }
`);

/**
 *  Perp stop orders, newest first — the read that makes TP/SL usable.
 *
 *  Indexer tier. Every scope the UI needs comes from the same call:
 *
 *  - **A trader's working stops** — `{ account }`. The default status is `PENDING`.
 *  - **A market's whole pending book** — `{ pool }` with no account.
 *  - **History** — pass `status` (e.g. `["TRIGGERED", "TRIGGER_FAILED", "CANCELLED"]`).
 *
 *  `account` is optional deliberately: the registry is per-market, and a market-wide
 *  view of what will fire is a legitimate read (monitoring, keeper tooling), not just
 *  a per-user one.
 *
 *  There is no chain fallback. The registry exposes no enumeration getter, so if the
 *  indexer has not seen a creation, nothing can list it.
 *
 * **Details**
 *
 * - `opts.account`: restrict to one owner; omit for the whole market
 * - `opts.pool`: restrict to one perp pool
 * - `opts.status`: lifecycle states to include; default `["PENDING"]`
 * - `opts.limit`: max rows, default 200
 * - `opts.offset`: row offset for paging, default 0
 */
export async function listPerpStopOrders(
  opts: {
    account?: string;
    pool?: string;
    status?: StopOrderStatus[];
    limit?: number;
    offset?: number;
  } = {},
  indexerUrl: IndexerRead.Source,
): Promise<PerpStopOrder[]> {
  // The StopOrder entity is shared with spot; without a type scope a perp read would
  // return spot stops too, and their orderIdRaw addresses a different registry entirely.
  // Scoped on `market_id` — the leading column of `(market, status, createdAt, id)` —
  // not the `market` relationship (see pools.ts, "type scope, as pools"). This read
  // runs on every perp pool page for every visitor, wallet or not.
  const where: Record<string, unknown> = {
    ...(await Pools.marketScope({ pool: opts.pool, marketType: "PERP" }, indexerUrl)),
  };
  if (opts.account != null) where.owner = { _eq: opts.account.toLowerCase() };
  const statuses = opts.status != null && opts.status.length > 0 ? opts.status : ["PENDING"];
  where.status = { _in: statuses };

  const data = await IndexerRead.gqlRequest(
    PerpStopOrdersQuery,
    { where, limit: opts.limit ?? 200, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return IndexerRead.narrowIndexerInvariant<PerpStopOrder>(
    data.StopOrder.map((o) => ({
      ...o,
      // The enum arrives as its on-chain index. Decoded here so a consumer branches on
      // a name rather than re-deriving the mapping — and null on success, where the
      // contract's `None` would otherwise read as a reason.
      dropReason: o.dropReason == null ? null : (PERP_STOP_DROP_REASON[o.dropReason] ?? null),
      // Same treatment, same reason: the enum arrives as its on-chain index, and an index
      // this SDK does not recognize becomes null rather than the default member. The
      // column is nullable because `StopOrder` is shared with spot, whose registry has no
      // intent at all — a PERP-scoped read should never see that, but a null column is
      // not a decode failure and must not be reported as one.
      intent: o.intent == null ? null : decodeIntent(o.intent),
    })),
  );
}

// ---------------------------------------------------------------------------
// Writes + the per-order chain read.
//
// The registry places the triggered order via PerpPool.placeOrderFor. Perps reserve
// the pool's SYSTEM allowlist for MarginBank, so the registry is admitted ONLY by the
// owner's per-user operator approval — without it a trigger reverts and the prepaid
// SOMI is consumed for nothing. That approval is a one-time, cross-pool grant, so it
// is checked and granted here rather than left as a documented prerequisite.
//
// Unlike spot there is no token escrow leg: perp collateral is a single USDso balance
// in the MarginBank, so there is nothing to approve to the pool and no native
// pre-load. Margin is the trader's own problem — a stop that cannot be margined at
// trigger surfaces as a drop, not a revert here.

// IOrderBook.placeOrderFor — the capability the registry must hold for the owner.
const PLACE_ORDER_FOR_SELECTOR = "0x80054449" as const;

/** Intent as the contract encodes it: 0 = ReduceOnly, 1 = Opening. */
const INTENT_INDEX = { reduceOnly: 0, opening: 1 } as const;

/**
 *  Decode a raw `OrderIntent` index, `null` for anything this SDK does not know.
 *
 *  A table plus a null fallback rather than `=== 1 ? "opening" : "reduceOnly"`, because
 *  the else-branch of that ternary is the UNSAFE direction: it would assert that an order
 *  can only reduce a position when a future member might let it open one. This registry
 *  demonstrably appends to its enums — `DropReason` gained `NoFill` — so treating an
 *  unrecognized member as the default is a claim, not a decode.
 *
 *  Kept out of the input union deliberately: `PerpStopIntent` is also what a CALLER passes
 *  to {@link placePerpStopOrder}, and there is no order to place with an unknown intent.
 */
export function decodeIntent(raw: number): PerpStopIntent | null {
  if (raw === INTENT_INDEX.reduceOnly) return "reduceOnly";
  if (raw === INTENT_INDEX.opening) return "opening";
  return null;
}

/**
 *  SOMI a PerpStopOrderRegistry charges per pending order (funds the reactivity
 *  trigger gas; refunded on cancel, consumed on every fire). Raw wei, 18dp native.
 *
 *  A linked pair costs twice this — one payment funds one trigger.
 */
export async function getPerpStopOrderSomiPayment(registry: Address, client: PublicClient): Promise<bigint> {
  return client.readContract({
    address: registry,
    abi: TradeAbi.perpStopRegistryWriteAbi,
    functionName: "somiPaymentPerOrder",
  });
}

/**
 * One stored perp stop, read straight from the registry.
 *
 * @category perpetual markets
 */
export type PerpStopOrderOnChain = {
  /** True = the triggered order buys. */
  isBid: boolean;
  /** Owner (checksummed as the contract stores it). */
  owner: Address;
  /** Raw base units; `0n` means "the whole position at trigger". */
  quantity: bigint;
  /** Mark price that arms it. */
  triggerPrice: bigint;
  /** 0 = GTE, 1 = LTE. */
  triggerOperator: number;
  /** 0 = LIMIT, 1 = MARKET. */
  orderType: number;
  /** The LIMIT price — the one field the indexer cannot see, since no event carries it. */
  limitPrice: bigint;
  /** Builder tagged on the triggered order; zero address for none. */
  builder: Address;
  /** Builder fee in bps x 1000. */
  builderFeeBpsTimes1k: bigint;
  /** SOMI paid at creation. */
  somiPaid: bigint;
  /** The linked sibling's id, or `0n` when unlinked. */
  siblingOrderId: bigint;
  /**
   *  `"reduceOnly"` or `"opening"` — `null` if the registry reported an intent this SDK
   *  version does not know.
   *
   *  Null is deliberately not folded into `"reduceOnly"`. The registry appends to its
   *  enums, and calling an unknown member reduce-only would tell a caller an order cannot
   *  increase their position when a newer member might let it. Treat null as "upgrade the
   *  SDK before acting on this", not as a default.
   */
  intent: PerpStopIntent | null;
};

/** One registry stop identifier for a batched chain read. */
export type PerpStopOrderRef = {
  /** The PerpStopOrderRegistry that owns the stop. */
  registry: Address;
  /** The registry's uint128 order identifier. */
  orderId: bigint | string;
};

/** A failed member of {@link PerpStopOrderRead}. */
export type PerpStopOrderReadError = SomniaMarketsSocketFailure;

/**
 * One result from {@link SomniaMarketsClient.getPerpStopOrders}.
 *
 * A non-live stop is known absent. A failed chain call stays distinct because the
 * caller cannot safely treat an unreadable stop as cancelled or triggered.
 */
export type PerpStopOrderRead =
  | { status: "present"; order: PerpStopOrderOnChain }
  | { status: "absent" }
  | { status: "failed"; error: PerpStopOrderReadError };

type PendingOrderResult = ReadContractReturnType<typeof TradeAbi.perpStopRegistryWriteAbi, "getPendingOrder">;

const MAX_PERP_STOP_ORDER_ID = (1n << 128n) - 1n;

const parsePerpStopOrderId = (orderId: bigint | string): bigint => {
  try {
    const parsed = BigInt(orderId);
    if (parsed < 0n || parsed > MAX_PERP_STOP_ORDER_ID) {
      throw new InvalidInputError("perp stop orderId must fit uint128");
    }
    return parsed;
  } catch (cause) {
    if (cause instanceof InvalidInputError) throw cause;
    throw new InvalidInputError("perp stop orderId must be an integer", { cause });
  }
};

const validateCanonicalPerpStopOrderId = (orderId: bigint | string): bigint => {
  if (typeof orderId === "string" && !/^(0|[1-9][0-9]*)$/.test(orderId)) {
    throw new InvalidInputError("perp stop orderId must use canonical unsigned decimal syntax");
  }
  return parsePerpStopOrderId(orderId);
};

const getPendingOrderCall = (ref: PerpStopOrderRef) => ({
  address: ref.registry,
  abi: TradeAbi.perpStopRegistryWriteAbi,
  functionName: "getPendingOrder" as const,
  args: [parsePerpStopOrderId(ref.orderId)] as const,
});

const mapPendingOrder = ([live, stored]: PendingOrderResult): PerpStopOrderOnChain | null => {
  if (!live) return null;
  const trigger = stored.orderWithTrigger;
  return {
    isBid: trigger.order.isBid,
    owner: trigger.order.owner,
    quantity: trigger.order.quantity,
    triggerPrice: trigger.triggerPrice,
    triggerOperator: trigger.triggerOperator,
    orderType: trigger.orderType,
    limitPrice: trigger.limitPrice,
    builder: trigger.builder,
    builderFeeBpsTimes1k: trigger.builderFeeBpsTimes1k,
    somiPaid: stored.somiPaid,
    siblingOrderId: stored.siblingOrderId,
    intent: decodeIntent(stored.intent),
  };
};

const toPerpStopOrderReadError = (caught: unknown, ref: PerpStopOrderRef): PerpStopOrderReadError => {
  const typed = Errors.sdkFailure(caught, InvariantError);
  if (typed) return typed;
  const error = Revert.toSdkError(caught, "getPerpStopOrder", {
    address: ref.registry,
    functionName: "getPendingOrder",
  });
  if (error instanceof RpcError || error instanceof ContractRevertError) return error;
  return new RpcError("getPerpStopOrder", error.message, { cause: error });
};

const toPerpStopOrderRead = (result: PendingOrderResult): PerpStopOrderRead => {
  const order = mapPendingOrder(result);
  if (order == null) return { status: "absent" };
  return { status: "present", order };
};

const FALLBACK_CONCURRENCY = 8;

const readPerpStopOrdersIndividually = async (
  refs: readonly PerpStopOrderRef[],
  client: PublicClient,
  blockNumber: bigint,
): Promise<readonly PerpStopOrderRead[]> => {
  const results: Array<PerpStopOrderRead | undefined> = Array.from({ length: refs.length });
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < refs.length) {
      const index = nextIndex;
      nextIndex += 1;
      const ref = refs[index];
      if (ref == null) throw new Error(`getPerpStopOrders: missing ref at index ${index}`);
      try {
        const result = await client.readContract({ ...getPendingOrderCall(ref), blockNumber });
        results[index] = toPerpStopOrderRead(result);
      } catch (caught) {
        results[index] = { status: "failed", error: toPerpStopOrderReadError(caught, ref) };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(FALLBACK_CONCURRENCY, refs.length) }, worker));
  return results.map((result, index) => {
    if (result == null) throw new Error(`getPerpStopOrders: missing result at index ${index}`);
    return result;
  });
};

/**
 *  Read one pending stop straight from the registry — the chain tier the listing
 *  never had.
 *
 *  Worth using even though {@link listPerpStopOrders} exists, for two reasons the
 *  indexer cannot cover. It answers during a reindex or an indexer outage. And it is
 *  the ONLY way to see a LIMIT stop's `limitPrice`, its linked `siblingOrderId`, and
 *  its `intent` — none of which any event carries, so nothing off-chain can show them.
 *
 *  It cannot enumerate: the registry exposes no per-owner getter, so listing still
 *  requires the indexer. Fetch ids there, then enrich here.
 *
 * **Details**
 *
 * - Returns: `null` when the id is not live. **Do not infer liveness from the returned terms** — a cancelled or triggered order keeps its stored id until its slot is recycled, so a dead id reads back with a matching id and plausible values. The contract's `live` flag is the only truth, and this returns `null` on it.
 *
 * @throws {@link InvalidInputError} The order id is not a valid uint128 integer.
 */
export async function getPerpStopOrder(
  p: PerpStopOrderRef,
  client: PublicClient,
): Promise<PerpStopOrderOnChain | null> {
  return mapPendingOrder(await client.readContract(getPendingOrderCall(p)));
}

/**
 * Read known perp stops in one ordered batch.
 *
 * Use {@link listPerpStopOrders} to discover ids. This method enriches those ids
 * with authoritative chain liveness and fields that events do not contain. It uses
 * a batched Multicall3 read when the configured chain supports it. Other chains use
 * a bounded point-read fallback. Both paths pin one head before reading, so every
 * result describes the same block even when viem splits a large multicall into chunks.
 *
 * The result at each index belongs to the ref at the same index. A failed member does
 * not discard neighboring reads and is not reported as known absence.
 *
 * @throws {@link InvalidInputError} An order id is not a canonical unsigned uint128 decimal.
 * A member-level contract revert or RPC failure is returned as `failed`. The method
 * rejects only when it cannot pin the head or the batch result itself is malformed.
 *
 * @throws {@link RpcError} The head could not be pinned or the batch result was malformed.
 * @throws {@link ContractRevertError} The Multicall3 aggregate rejected the batch.
 */
export async function getPerpStopOrders(
  refs: readonly PerpStopOrderRef[],
  client: PublicClient,
): Promise<readonly PerpStopOrderRead[]> {
  if (refs.length === 0) return [];
  const validatedRefs = refs.map((ref) => ({ ...ref, orderId: validateCanonicalPerpStopOrderId(ref.orderId) }));
  const contracts = validatedRefs.map(getPendingOrderCall);
  const blockNumber = await client.getBlockNumber().catch((caught: unknown) => {
    throw Revert.toSdkError(caught, "getPerpStopOrders");
  });
  if (typeof client.multicall !== "function" || !client.chain?.contracts?.multicall3) {
    return readPerpStopOrdersIndividually(validatedRefs, client, blockNumber);
  }
  try {
    const results = await client.multicall({ contracts, allowFailure: true, blockNumber });
    if (results.length !== validatedRefs.length) {
      throw new RpcError(
        "getPerpStopOrders",
        `expected ${validatedRefs.length} multicall results, received ${results.length}`,
      );
    }
    return results.map((result, index) => {
      const ref = validatedRefs[index];
      if (ref == null) throw new Error(`getPerpStopOrders: missing ref at index ${index}`);
      if (result.status === "failure") {
        return { status: "failed", error: toPerpStopOrderReadError(result.error, ref) };
      }
      try {
        return toPerpStopOrderRead(result.result);
      } catch (caught) {
        return { status: "failed", error: toPerpStopOrderReadError(caught, ref) };
      }
    });
  } catch (caught) {
    if (caught instanceof ChainDoesNotSupportContract) {
      return readPerpStopOrdersIndividually(validatedRefs, client, blockNumber);
    }
    throw caught;
  }
}

/** One leg in the shape the registry's create functions take. */
type TriggerTuple = ReturnType<typeof toTriggerTuple>;

/** Shapes one leg into the registry's `PendingOrderWithTrigger` tuple. */
function toTriggerTuple(leg: PerpStopOrderLeg, owner: Address) {
  return {
    order: { isBid: leg.isBid, owner, userData: 0n, quantity: leg.quantity },
    orderType: leg.stopOrderType,
    triggerPrice: leg.triggerPrice,
    triggerOperator: leg.triggerOperator,
    limitPrice: leg.limitPrice ?? 0n,
    builder: leg.builder ?? Writer.ZERO_ADDRESS,
    builderFeeBpsTimes1k: leg.builderFeeBpsTimes1k ?? 0n,
  };
}

/** Shared per-leg validation — the checks the registry would revert on anyway. */
function validateLeg(leg: PerpStopOrderLeg, intent: PerpStopIntent, label: string): void {
  if (leg.triggerPrice <= 0n) throw new InvalidInputError(`${label}: triggerPrice must be > 0`);
  if (leg.quantity < 0n) throw new InvalidInputError(`${label}: quantity cannot be negative`);
  if (leg.quantity === 0n && intent === "opening") {
    // Zero means "the whole position", which an order meant to CREATE exposure has
    // none of. Caught here so it fails before the SOMI is spent.
    throw new InvalidInputError(`${label}: an opening stop needs a non-zero quantity`);
  }
  if (leg.stopOrderType === 0 && (leg.limitPrice ?? 0n) <= 0n) {
    throw new InvalidInputError(`${label}: a LIMIT stop needs limitPrice > 0`);
  }
  if (leg.stopOrderType === 1 && (leg.limitPrice ?? 0n) !== 0n) {
    throw new InvalidInputError(`${label}: a MARKET stop must not set limitPrice`);
  }
  if (leg.builder == null && (leg.builderFeeBpsTimes1k ?? 0n) > 0n) {
    throw new InvalidInputError(`${label}: builderFeeBpsTimes1k needs a builder`);
  }
}

/**
 *  One unpaired leg as a call — the intent split, which is a contract-level detail.
 *
 *  Reduce-only routes through the original entry point so an unchanged caller produces
 *  an unchanged transaction; `createTriggerOrder` is the only one that takes an intent.
 */
function singleLegCall(a: {
  registry: Address;
  leg: TriggerTuple;
  intent: PerpStopIntent;
  somi: bigint;
  gas: bigint;
}): Writer.WriteCall {
  const call = { address: a.registry, abi: TradeAbi.perpStopRegistryWriteAbi, gas: a.gas, value: a.somi };
  if (a.intent === "reduceOnly") {
    return { ...call, functionName: "createPendingOrder", args: [a.leg] };
  }
  return { ...call, functionName: "createTriggerOrder", args: [a.leg, INTENT_INDEX.opening] };
}

/**
 *  Both legs as a one-cancels-other pair, at twice the SOMI — one payment funds one
 *  trigger.
 *
 *  The registry names its legs by operator, not by argument order, so they are routed
 *  here rather than trusting the caller to have passed GTE first.
 */
function linkedPairCall(a: {
  registry: Address;
  self: TriggerTuple;
  other: TriggerTuple;
  selfIsGte: boolean;
  somi: bigint;
  gas: bigint;
}): Writer.WriteCall {
  const [gte, lte] = a.selfIsGte ? [a.self, a.other] : [a.other, a.self];
  return {
    address: a.registry,
    abi: TradeAbi.perpStopRegistryWriteAbi,
    functionName: "createLinkedPendingOrders",
    args: [gte, lte],
    gas: a.gas,
    value: a.somi * 2n,
  };
}

/**
 *  Validate a placement and shape it into the ONE registry call it becomes.
 *
 *  Split out of {@link placePerpStopOrder} so the sending verb and
 *  {@link buildPlacePerpStopOrder} encode from one definition — a build-only verb
 *  whose bytes can drift from what actually gets sent is worse than no build verb,
 *  because the drift is invisible until a UserOp reverts.
 */
function stopPlacementCall(
  w: WriterCtx,
  p: PlacePerpStopOrderParams,
  a: { intent: PerpStopIntent; somi: bigint; gas: bigint },
): Writer.WriteCall {
  validateLeg(p, a.intent, "stop order");
  const self = toTriggerTuple(p, w.fromAddress);
  if (p.pair == null) {
    return singleLegCall({ registry: p.registry, leg: self, intent: a.intent, somi: a.somi, gas: a.gas });
  }
  if (a.intent === "opening") {
    throw new InvalidInputError("a linked pair must be reduce-only on both legs");
  }
  validateLeg(p.pair, "reduceOnly", "paired leg");
  if (p.triggerOperator === p.pair.triggerOperator) {
    throw new InvalidInputError("a linked pair needs opposite trigger operators (one GTE, one LTE)");
  }
  if (p.isBid !== p.pair.isBid) {
    throw new InvalidInputError("a linked pair must be the same side — both legs reduce one position");
  }
  return linkedPairCall({
    registry: p.registry,
    self,
    other: toTriggerTuple(p.pair, w.fromAddress),
    selfIsGte: p.triggerOperator === 0,
    somi: a.somi,
    gas: a.gas,
  });
}

/**
 *  The one-time operator grant that lets the registry place on the owner's behalf.
 *
 *  Without it the trigger reverts and the prepaid SOMI is consumed having placed
 *  nothing — which is why both the sending verb and the build twin default to
 *  covering it.
 */
function operatorGrantCall(w: WriterCtx, p: PlacePerpStopOrderParams, gas: bigint): Writer.WriteCall {
  const operatorRegistry = p.operatorRegistry ?? w.addresses().operatorPermissionsRegistry;
  if (!operatorRegistry) {
    throw new NotConfiguredError("operatorRegistry or addresses.operatorPermissionsRegistry", "a perp stop order");
  }
  return {
    address: operatorRegistry,
    abi: TradeAbi.operatorRegistryWriteAbi,
    functionName: "setOperatorApprovalGlobal",
    args: [p.registry, [PLACE_ORDER_FOR_SELECTOR], true],
    gas,
  };
}

/**
 *  Registry order ids from a receipt's logs, in the registry's own (GTE, LTE) order.
 *
 *  The ids only surface through `PendingOrderCreated` — the create functions' return
 *  value is unreadable from a receipt — so this is the only way to learn what a
 *  placement created. `trader.placePerpStopOrder` calls it for you; it is exported for
 *  the build path, where the caller sends the transaction and so holds the only copy
 *  of the receipt.
 *
 *  Filters to `registry`'s own logs: another contract could emit a matching signature,
 *  and in a batched UserOp several contracts' logs share one receipt.
 *
 * **Details**
 *
 * - `logs`: The receipt's logs.
 * - `registry`: The PerpStopOrderRegistry the placement targeted.
 * - Returns: The created ids, oldest first; empty if the receipt created none.
 *
 * **Example** (Decoding submitted stop IDs)
 *
 *  ```ts
 *  const { stopOrder } = await trader.buildPlacePerpStopOrder({
 *    registry, pool, isBid: false, quantity: 10_000_000n,
 *    triggerPrice: 90_000_000_000_000_000_000n, triggerOperator: 1, stopOrderType: 1,
 *    skipOperatorApproval: true,
 *  });
 *  const receipt = await myBatcher.send([stopOrder]);
 *  const [stopOrderId] = decodePerpStopOrderIds(receipt.logs, registry);
 *  ```
 *
 * @category perpetual markets
 */
export function decodePerpStopOrderIds(
  logs: readonly { address: string; data: Hex; topics: readonly Hex[] }[],
  registry: Address,
): bigint[] {
  const created: bigint[] = [];
  for (const log of logs) {
    if (log.address.toLowerCase() !== registry.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: TradeAbi.perpStopRegistryEventsAbi,
        data: log.data,
        topics: log.topics as [signature: Hex, ...args: Hex[]],
      });
      if (decoded.eventName === "PendingOrderCreated") created.push(decoded.args.orderId);
    } catch {
      // Not a registry event we model — skip.
    }
  }
  return created;
}

/**
 *  Place a perp take-profit / stop-loss, optionally as a linked pair, optionally
 *  opening.
 *
 *  The single create entry point. `intent` defaults to reduce-only, so a caller that
 *  passes neither `intent` nor `pair` gets exactly the order this SDK always
 *  described; the contract-level split between `createPendingOrder` and
 *  `createTriggerOrder` is an implementation detail resolved here.
 *
 *  Grants the registry's one-time operator approval first if the owner has not already
 *  (skip with `skipOperatorApproval`). That is not a convenience: without it the
 *  trigger reverts and the prepaid SOMI is consumed having placed nothing.
 */
export async function placePerpStopOrder(w: WriterCtx, p: PlacePerpStopOrderParams): Promise<PlacePerpStopOrderResult> {
  const intent = p.intent ?? "reduceOnly";
  const gas = p.gas ?? w.defaultGas;
  const somi = p.somiPayment ?? (await getPerpStopOrderSomiPayment(p.registry, w.publicClient));
  // Encoded (and validated) before the grant is sent, so bad input fails without
  // having moved anything on chain.
  const call = stopPlacementCall(w, p, { intent, somi, gas });

  if (p.skipOperatorApproval !== true) {
    const authorized = await w.publicClient.readContract({
      address: p.pool,
      abi: TradeAbi.operatorAuthorizationReadAbi,
      functionName: "isOperatorAuthorized",
      args: [w.fromAddress, p.registry, PLACE_ORDER_FOR_SELECTOR],
    });
    if (!authorized) await w.execute(operatorGrantCall(w, p, gas));
  }

  const result = await w.execute(call);
  // A pair emits two ids, in the registry's (GTE, LTE) order.
  const created = decodePerpStopOrderIds(result.receipt.logs, p.registry);

  if (p.pair == null) return { ...result, stopOrderId: created[0] };
  // Report the caller's own leg first, whichever operator it was.
  const selfIsGte = p.triggerOperator === 0;
  const [gteId, lteId] = created;
  const mine = selfIsGte ? gteId : lteId;
  const theirs = selfIsGte ? lteId : gteId;
  return { ...result, stopOrderId: mine, pairedStopOrderId: theirs };
}

/**
 *  Link two existing pending stops into a one-cancels-other pair.
 *
 *  Moves no SOMI. The pair constraints are the registry's and are enforced there:
 *  same owner, same side, opposite operators, straddling, both reduce-only.
 */
export async function linkPerpStopOrders(w: WriterCtx, p: LinkPerpStopOrdersParams): Promise<TxResult> {
  return w.execute({
    address: p.registry,
    abi: TradeAbi.perpStopRegistryWriteAbi,
    functionName: "linkPendingOrders",
    args: [BigInt(p.orderIdA), BigInt(p.orderIdB)],
    gas: p.gas ?? w.defaultGas,
  });
}

/**
 *  Cancel one pending perp stop and refund its SOMI.
 *
 *  If it is one leg of a linked pair, the OTHER leg stays armed and becomes unlinked —
 *  cancelling one order cancels one order. Use {@link cancelPerpStopOrders} to tear
 *  down both.
 */
export async function cancelPerpStopOrder(w: WriterCtx, p: CancelStopOrderParams): Promise<TxResult> {
  return w.execute(cancelOneCall(w, p));
}

/** Split out of {@link cancelPerpStopOrder} — see {@link stopPlacementCall}. */
function cancelOneCall(w: WriterCtx, p: CancelStopOrderParams): Writer.WriteCall {
  return {
    address: p.registry,
    abi: TradeAbi.perpStopRegistryWriteAbi,
    functionName: "cancelPendingOrder",
    args: [BigInt(p.orderId)],
    gas: p.gas ?? w.defaultGas,
  };
}

/**
 *  Cancel several pending perp stops in one transaction, refunded in a single
 *  transfer. The way to tear down a linked pair.
 *
 *  All-or-nothing: every id must be live and owned by the signer, so one stale id
 *  reverts the batch rather than silently skipping.
 */
export async function cancelPerpStopOrders(w: WriterCtx, p: CancelPerpStopOrdersParams): Promise<TxResult> {
  return w.execute(cancelManyCall(w, p));
}

/** Split out of {@link cancelPerpStopOrders} — see {@link stopPlacementCall}. */
function cancelManyCall(w: WriterCtx, p: CancelPerpStopOrdersParams): Writer.WriteCall {
  if (p.orderIds.length === 0) throw new InvalidInputError("orderIds must not be empty");
  return {
    address: p.registry,
    abi: TradeAbi.perpStopRegistryWriteAbi,
    functionName: "cancelPendingOrders",
    args: [p.orderIds.map((id) => BigInt(id))],
    gas: p.gas ?? w.defaultGas,
  };
}

// ---------------------------------------------------------------------------
// Build-only stop writes. Same inputs as the sending verbs, but they hand back
// the unsigned call instead of signing it — so a caller can put an order and its
// TP/SL into ONE transaction, which is the flow the sending verbs cannot express:
// sent separately, the order can fill and sit with no stop on it.
//
// Each shares its call construction with its sending twin above, so the calldata
// cannot drift from what `placePerpStopOrder` / `cancelPerpStopOrder(s)` send.
// ---------------------------------------------------------------------------

/**
 *  A perp stop placement expanded into the unsigned calls it actually takes.
 *
 *  Two or one, and the difference matters more here than for a token approval: the
 *  registry places on the owner's behalf, so without the operator grant the trigger
 *  reverts **and the prepaid SOMI is consumed having placed nothing**. Batch both.
 *
 * @category perpetual markets
 */
export interface UnsignedPerpStopOrder {
  /** The registry call that creates the stop — or, for a `pair`, both legs at once. */
  stopOrder: Writer.UnsignedCall;
  /**
   *  The one-time operator grant the trigger needs first; absent only when
   *  `skipOperatorApproval: true` was passed.
   */
  operatorApproval?: Writer.UnsignedCall;
}

/**
 *  Build a perp take-profit / stop-loss without sending it.
 *
 *  Takes exactly the parameters {@link placePerpStopOrder} takes and returns the
 *  unsigned calls instead of broadcasting them, so an order and the stop that
 *  protects it can go out as ONE transaction — an ERC-4337 UserOp, a Safe batch, a
 *  relayed multicall.
 *
 *  **Details**
 *
 *  `value` on the returned call carries the SOMI the trigger is prepaid with (twice
 *  it for a `pair` — one payment funds one trigger), and your batcher must forward it.
 *  Pass `somiPayment` to skip the registry read that resolves it.
 *
 * - `p`: The same inputs as {@link placePerpStopOrder}.
 * - Returns: The stop-order call, and the operator grant unless skipped.
 *
 *  **Gotchas**
 *
 *  - `operatorApproval` is returned whenever `skipOperatorApproval` is not `true`,
 *    **without** checking whether the grant is already in place — that check is an
 *    `eth_call`, which a build-only verb should not make. So it may be redundant,
 *    never short. Re-granting is a no-op on chain; pass `skipOperatorApproval: true`
 *    once you know the owner has it.
 *  - No ids come back: they only exist after the transaction you send. Recover them
 *    from your own receipt with {@link decodePerpStopOrderIds}.
 *  - Order matters. `operatorApproval` must execute before `stopOrder`.
 *
 * - Throws {@link InvalidInputError} on the same leg/pair violations the sending verb rejects.
 * - Throws {@link NotConfiguredError} when no operator registry is configured and the grant was not skipped.
 *
 * **Example** (Building paired stops)
 *
 *  A stop and its take-profit as ONE transaction, so neither leg can land alone.
 *
 *  ```ts
 *  const { stopOrder, operatorApproval } = await trader.buildPlacePerpStopOrder({
 *    registry, pool, isBid: false, quantity: 10_000_000n,
 *    triggerPrice: 90_000_000_000_000_000_000n, triggerOperator: 1, stopOrderType: 1,
 *    pair: {
 *      isBid: false, quantity: 10_000_000n,
 *      triggerPrice: 120_000_000_000_000_000_000n, triggerOperator: 0, stopOrderType: 1,
 *    },
 *  });
 *  // The grant goes FIRST — without it the trigger reverts and the SOMI is spent anyway.
 *  const calls = operatorApproval ? [operatorApproval, stopOrder] : [stopOrder];
 *  const receipt = await myBatcher.send(calls);
 *  const [stopOrderId, pairedStopOrderId] = decodePerpStopOrderIds(receipt.logs, registry);
 *  ```
 */
export async function buildPlacePerpStopOrder(
  w: WriterCtx,
  p: PlacePerpStopOrderParams,
): Promise<UnsignedPerpStopOrder> {
  const intent = p.intent ?? "reduceOnly";
  const gas = p.gas ?? w.defaultGas;
  const somi = p.somiPayment ?? (await getPerpStopOrderSomiPayment(p.registry, w.publicClient));
  const stopOrder = Writer.toUnsigned(
    w.chain.id,
    stopPlacementCall(w, p, { intent, somi, gas }),
    `Place ${p.pair != null ? "a linked TP/SL pair" : `a ${intent === "opening" ? "opening" : "reduce-only"} stop`} on perp registry ${p.registry}`,
  );
  if (p.skipOperatorApproval === true) return { stopOrder };
  return {
    stopOrder,
    operatorApproval: Writer.toUnsigned(
      w.chain.id,
      operatorGrantCall(w, p, gas),
      `Approve perp stop registry ${p.registry} to place orders on pool ${p.pool}`,
    ),
  };
}

/**
 *  Build the cancel of one pending perp stop without sending it.
 *
 *  Same inputs and same single call as {@link cancelPerpStopOrder}; the SOMI refund
 *  is the registry's business either way. Cancelling one leg of a linked pair still
 *  leaves the other armed and unlinked — use {@link buildCancelPerpStopOrders} to
 *  tear down both in one call.
 *
 * **Details**
 *
 * - `p`: The same inputs as {@link cancelPerpStopOrder}.
 * - Returns: The unsigned cancel call.
 *
 * **Example** (Building one cancellation)
 *
 *  ```ts
 *  const cancel = trader.buildCancelPerpStopOrder({ registry, orderId: "42" });
 *  await myBatcher.send([cancel]);
 *  ```
 */
export function buildCancelPerpStopOrder(w: WriterCtx, p: CancelStopOrderParams): Writer.UnsignedCall {
  return Writer.toUnsigned(
    w.chain.id,
    cancelOneCall(w, p),
    `Cancel perp stop order ${p.orderId} on registry ${p.registry}`,
  );
}

/**
 *  Build the cancel of several pending perp stops without sending it.
 *
 *  All-or-nothing on chain, exactly as {@link cancelPerpStopOrders} is: every id must
 *  be live and owned by the signer, so one stale id reverts the whole call — and, in a
 *  batch, whatever you packed with it.
 *
 * **Details**
 *
 * - `p`: The same inputs as {@link cancelPerpStopOrders}.
 * - Returns: The unsigned batch-cancel call.
 *
 * **Gotchas**
 *
 * - Throws {@link InvalidInputError} when `orderIds` is empty.
 *
 * **Example** (Building a batch cancellation)
 *
 *  ```ts
 *  const cancelBoth = trader.buildCancelPerpStopOrders({ registry, orderIds: ["42", "43"] });
 *  await myBatcher.send([cancelBoth]);
 *  ```
 */
export function buildCancelPerpStopOrders(w: WriterCtx, p: CancelPerpStopOrdersParams): Writer.UnsignedCall {
  return Writer.toUnsigned(
    w.chain.id,
    cancelManyCall(w, p),
    `Cancel ${p.orderIds.length} perp stop orders on registry ${p.registry}`,
  );
}

/**
 *  Claim the SOMI the registry owes the signer.
 *
 *  **When to use** — whenever {@link getUnclaimedPerpStopSomi} reports a non-zero
 *  balance. Two things credit it: a cancel whose direct SOMI refund FAILED (a contract
 *  owner with no payable receiver), and an operator winding the registry down, which
 *  credits every owner unconditionally — **EOAs included**. Do not skip the check on
 *  the assumption that an EOA is never owed anything.
 *
 *  **Details** — caller-scoped: it pays out the signer, never an arbitrary account.
 *  Read the balance first with {@link getUnclaimedPerpStopSomi}.
 *
 *  **Gotchas** — reverts `NothingToClaim` on a zero balance, so read first rather
 *  than claiming speculatively. The payout is a plain native transfer to the caller, so
 *  an owner that STILL cannot receive native reverts `WithdrawalFailed` and the balance
 *  stays put — this recovers funds for an owner whose receive capability changed, or
 *  for anyone credited by a registry wind-down, but it cannot rescue a permanently
 *  non-payable contract. Both errors decode by name — they are in the generated
 *  contract-error table — so a revert arrives as a named error rather than raw data.
 */
export async function claimPerpStopSomi(w: WriterCtx, p: ClaimPerpStopSomiParams): Promise<TxResult> {
  return w.execute({
    address: p.registry,
    abi: TradeAbi.perpStopRegistryWriteAbi,
    functionName: "claimSomi",
    args: [],
    gas: p.gas ?? w.defaultGas,
  });
}

/**
 *  SOMI the perp stop registry owes `account`, in wei.
 *
 *  **When to use** — before `trader.claimPerpStopSomi`, which reverts on a zero
 *  balance. Non-zero means the registry is holding SOMI for this account.
 *
 *  **Details** — an on-chain read, not indexed. Two things credit it: a cancel whose
 *  direct refund transfer failed (a contract owner with no payable receiver), and an
 *  operator winding the registry down, which credits every owner unconditionally.
 *  The second reaches **EOAs too**, so a non-zero balance is NOT diagnostic of a
 *  contract owner and an EOA is not safe to skip. The trigger path is the opposite:
 *  `somiPaid` is consumed on every fire and never refunded.
 */
export async function getUnclaimedPerpStopSomi(
  ref: { registry: Address; account: Address },
  client: PublicClient,
): Promise<bigint> {
  return client.readContract({
    address: ref.registry,
    abi: TradeAbi.perpStopRegistryWriteAbi,
    functionName: "unclaimedSomi",
    args: [ref.account],
  });
}
