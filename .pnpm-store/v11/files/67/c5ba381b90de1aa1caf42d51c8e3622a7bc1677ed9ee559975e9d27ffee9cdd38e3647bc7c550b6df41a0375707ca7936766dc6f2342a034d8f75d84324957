// Watch-scope snapshot loaders. Each fetches a CONSISTENT point-in-time view
// from the Envio/Hasura indexer — entity rows plus the block they are
// consistent to (chain_metadata.latest_processed_block) in a single GraphQL
// request — so a watch's live tail can stitch onto block X+1 with no gap and
// no double-count.
//
// This is the ONE place the live tail touches the indexer: hydrating a NEW
// watch scope (a market set, or a user's history). Everything after a scope's
// seam — including WS reconnects — is materialized from chain logs.
//
// Rows are MERGED into the store (see MaterializerStore.mergeSnapshot):
// hydrating one scope never clears another scope's state.

import * as GraphqlBoundary from "./graphqlBoundary.js";
import * as IndexerRead from "./indexerRead.js";
import { IndexerError } from "./errors.js";
import * as Markets from "./markets.js";
import type { RawMarketRow } from "./markets.js";
import type {
  BinaryFillKind,
  BinarySide,
  LiveFill,
  LiveMarket,
  LiveOrder,
  MaterializerStore,
  OrderStatus,
} from "./store.js";
import type { FundingPayment, LiquidationEvent } from "./perp/history.js";

/**
 *  Hydration requests are bounded by the same budget every other indexer read
 *  uses (`indexerRead.ts`, `priceFeed/query.ts`). Without it a hung indexer
 *  leaves a hydration promise pending forever: a scoped watch never settles, and
 *  the chain seed's detached fills lane never records its `fill-history` failure.
 */
const GQL_TIMEOUT_MS = 30_000;

/**
 *  Hydration reads go through the shared indexer boundary — failures are IndexerError.
 *
 *  `binding` is the owner's pending check that the indexer serves its chain. The
 *  request goes out alongside it, and the rows come back only after it passes, so
 *  a loader never merges rows from a misbound indexer.
 */
async function gql<T>(
  indexerUrl: string,
  query: string,
  variables: Record<string, unknown>,
  governor: GraphqlBoundary.EndpointGovernor | undefined,
  binding: Promise<void> | undefined,
): Promise<T> {
  return IndexerRead.afterBinding(
    GraphqlBoundary.postGraphql<T>(indexerUrl, query, variables, { timeoutMs: GQL_TIMEOUT_MS, governor }),
    binding,
  );
}

const FILL_FIELDS = `
  id market { id poolAddress } maker makerSide taker takerSide kind takerIsBid
  takerOrder_id makerOrder_id
  fillPrice quantity quoteQuantity takerRemainingQuantity makerRemainingQuantity
  timestamp blockNumber txHash
`;
const ORDER_FIELDS = `
  id market { id poolAddress } orderId owner side isBid userData price
  fullQuantity quantityRemaining filledQuantity status rested expireTimestampNs
  placedAtTimestamp placedTxHash
`;
const CHAIN_META = `chain_metadata(where: {chain_id: {_eq: $chainId}}) { latest_processed_block block_height }`;

interface RawFill {
  id: string;
  market: { id: string; poolAddress: string };
  // The indexer DOES denormalize taker/takerSide/kind onto the Fill, via the
  // PendingTakerFill bridge: the taker is unknown at OrderFilled time, so the
  // bridge stamps these once the taker's placement event lands. `takerSide` and
  // `kind` are BINARY-only and stay null on spot/perp, where Order.side is null.
  //
  // The `taker` column is populated for every pool type — backfilled inside the
  // fill's own transaction (see the `participatedAs` note in fills.ts) — which is
  // why the account FILTER matches it directly rather than reaching
  // through the relationship, and why it no longer costs a table scan.
  maker: string | null;
  makerSide: BinarySide | null;
  taker: string | null;
  takerSide: BinarySide | null;
  kind: BinaryFillKind | null;
  /** True when the taker bought the base/YES; null until the indexer's taker bridge lands. */
  takerIsBid: boolean | null;
  takerOrder_id: string;
  makerOrder_id: string;
  fillPrice: string;
  quantity: string;
  quoteQuantity: string;
  takerRemainingQuantity: string;
  makerRemainingQuantity: string;
  timestamp: string;
  blockNumber: string | number;
  txHash: string;
}

interface RawOrder {
  id: string;
  market: { id: string; poolAddress: string };
  orderId: string;
  owner: string;
  side: BinarySide | null;
  isBid: boolean;
  userData: string;
  price: string;
  fullQuantity: string;
  quantityRemaining: string;
  filledQuantity: string;
  status: OrderStatus;
  rested: boolean;
  expireTimestampNs: string;
  placedAtTimestamp: string;
  placedTxHash: string;
}

interface RawChainMeta {
  latest_processed_block: number | null;
  block_height: number | null;
}

export interface SnapshotSeam {
  /** Block the snapshot is consistent to — the watch's tail covers snapshotBlock+1.. */
  snapshotBlock: number;
  /** Chain head as the indexer sees it */
  reportedHeadBlock: number;
}

export interface MarketsSnapshotResult extends SnapshotSeam {
  /** Lowercased pool addresses of the hydrated markets — the watch's book set */
  pools: string[];
  /** Lowercased BinaryMarket contract addresses — the watch's status-event set */
  marketAddresses: string[];
  /**
   *  True when the all-markets snapshot found more eligible markets than
   *  {@link ALL_MARKETS_BUDGET} and hydrated only the newest ones. Always false
   *  for a pool-scoped snapshot, which asks for its pools by address.
   */
  truncated: boolean;
}

/**
 *  How many eligible markets one all-markets snapshot hydrates.
 *
 *  The snapshot asks for one row more than this. That extra row is the probe:
 *  when it comes back, the eligible set is larger than the budget and the
 *  result says so in `truncated`. The watch never reports a cut set as complete.
 */
export const ALL_MARKETS_BUDGET = 500;

/**
 *  The markets the all-markets watch hydrates: every SPOT and PERP market, and
 *  every BINARY market that is not finalized.
 *
 *  Finalization is the boundary because it is where a binary market stops
 *  producing events the live store applies. Before it, a Locked, Settling,
 *  Resolved or Voided market still emits lifecycle events, and module or pool
 *  finalization still changes its row. After it, the status is terminal,
 *  trading is closed, and the book holds no live order: expired orders are not
 *  hydrated, so their sweeps change nothing the store holds. The events that
 *  remain are the pool release and settlement redemptions. The release only
 *  frees the pool for a later market, and that market joins through its own
 *  `MarketCreated`. Redemptions move `netBacking` on the settlement ledger,
 *  which a finalized market's detail read serves from the indexer.
 *
 *  The first arm keeps SPOT and PERP rows. The null arm keeps a BINARY row the
 *  indexer has not stamped yet. This is {@link Markets.REGISTRY_ELIGIBLE_WHERE}
 *  as a GraphQL literal; `test/registrySweep.test.ts` pins the two together.
 */
const ELIGIBLE_MARKET_WHERE = `{_or: [{marketType: {_in: ["SPOT", "PERP"]}}, {finalized: {_is_null: true}}, {finalized: {_eq: false}}]}`;

function seamOf(meta: RawChainMeta | undefined): SnapshotSeam {
  const snapshotBlock = meta?.latest_processed_block ?? 0;
  return { snapshotBlock, reportedHeadBlock: meta?.block_height ?? snapshotBlock };
}

function logIndexFromId(id: string): number {
  const n = Number(id.split("_")[1]);
  return Number.isFinite(n) ? n : 0;
}

function toFill(r: RawFill, chainId: number): LiveFill {
  return {
    id: r.id,
    chainId,
    market_id: r.market.id,
    pool: Markets.lower0x(Markets.asAddress(r.market.poolAddress)),
    // taker/takerSide/kind come straight from the indexer's PendingTakerFill
    // bridge. They stay undefined only when the bridge has not stamped them yet,
    // or on spot/perp for the two BINARY-only fields; enrichFill still
    // back-joins whatever is missing at SELECT time.
    taker: r.taker ? Markets.lower0x(Markets.asAddress(r.taker)) : undefined,
    maker: r.maker ? Markets.lower0x(Markets.asAddress(r.maker)) : undefined,
    takerSide: r.takerSide ?? undefined,
    makerSide: r.makerSide ?? undefined,
    takerIsBid: r.takerIsBid ?? undefined,
    kind: r.kind ?? undefined,
    takerOrder_id: r.takerOrder_id,
    makerOrder_id: r.makerOrder_id,
    fillPrice: r.fillPrice,
    quantity: r.quantity,
    quoteQuantity: r.quoteQuantity,
    takerRemainingQuantity: r.takerRemainingQuantity,
    makerRemainingQuantity: r.makerRemainingQuantity,
    timestamp: r.timestamp,
    blockNumber: Number(r.blockNumber),
    logIndex: logIndexFromId(r.id),
    txHash: r.txHash,
  };
}

function toOrder(r: RawOrder, chainId: number): LiveOrder {
  return {
    id: r.id,
    chainId,
    market_id: r.market.id,
    pool: Markets.lower0x(Markets.asAddress(r.market.poolAddress)),
    orderId: r.orderId,
    owner: Markets.lower0x(Markets.asAddress(r.owner)),
    side: r.side ?? undefined,
    isBid: r.isBid,
    userData: r.userData,
    price: r.price,
    fullQuantity: r.fullQuantity,
    quantityRemaining: r.quantityRemaining,
    filledQuantity: r.filledQuantity,
    status: r.status,
    rested: r.rested,
    expireTimestampNs: r.expireTimestampNs,
    createdAt: r.placedAtTimestamp,
    txHash: r.placedTxHash,
  };
}

interface MarketsSnapshotResponse {
  chain_metadata: RawChainMeta[];
  Market: RawMarketRow[];
  Fill: RawFill[];
  openOrders?: RawOrder[];
}

/**
 *  The first all-markets request: which eligible markets to hydrate, newest first.
 *
 *  The snapshot request filters its fill and order arms by the markets this
 *  returns, through direct indexed columns (`Fill.pool`, `Order.market_id`).
 *  Filtering them through the `market` relationship would issue a correlated
 *  EXISTS per row, which has stalled the indexer under load.
 */
export const ELIGIBLE_MARKETS_QUERY = `query EligibleMarkets($marketLimit: Int!) {
      Market(where: ${ELIGIBLE_MARKET_WHERE}, order_by: [{createdAtTimestamp: desc}, {id: desc}], limit: $marketLimit) { id poolAddress }
    }`;

/** How many times the all-markets snapshot retries when its market selection moves under it. */
const ALL_MARKETS_ATTEMPTS = 3;

/**
 *  The markets-snapshot operation, in its two shapes. A pool-scoped watch
 *  filters on `$pools` and applies no eligibility filter: it still hydrates a
 *  finalized market while its pool serves it. The all-markets watch selects its
 *  markets by lifecycle eligibility ({@link ELIGIBLE_MARKET_WHERE}) and filters
 *  its fill and order arms by the `$pools` and `$marketIds` that
 *  {@link ELIGIBLE_MARKETS_QUERY} selected.
 *
 *  Hoisted out of the loader so `test/snapshotOperations.test.ts` can validate
 *  BOTH shapes against the committed Hasura schema. `liveExpiry` is inlined
 *  rather than a variable because it is a literal the caller stamps per request.
 */
export function marketsSnapshotQuery(scoped: boolean, liveExpiry: string): string {
  const marketWhere = scoped ? `where: {poolAddress: {_in: $pools}}, ` : `where: ${ELIGIBLE_MARKET_WHERE}, `;
  const orderWhere = scoped
    ? `{status: {_eq: "Open"}, ${liveExpiry}, market: {poolAddress: {_in: $pools}}}`
    : `{status: {_eq: "Open"}, ${liveExpiry}, market_id: {_in: $marketIds}}`;
  return `query MarketsSnapshot($chainId: Int!, $pools: [String!]!, ${scoped ? "" : "$marketIds: [String!]!, "}$marketLimit: Int!, $fillLimit: Int!, $orderLimit: Int!) {
      ${CHAIN_META}
      Market(${marketWhere}order_by: [{createdAtTimestamp: desc}, {id: desc}], limit: $marketLimit) { ${Markets.MARKET_FIELDS} }
      Fill(where: {pool: {_in: $pools}}, order_by: [{timestamp: desc}, {blockNumber: desc}], limit: $fillLimit) { ${FILL_FIELDS} }
      openOrders: Order(where: ${orderWhere}, order_by: {placedAtTimestamp: desc}, limit: $orderLimit) { ${ORDER_FIELDS} }
    }`;
}

/** Lowercased distinct pools of market rows, in row order. */
function poolsOf(rows: readonly { poolAddress: string }[]): string[] {
  return [...new Set(rows.map((row) => row.poolAddress.toLowerCase()))];
}

/**
 * Hydrate a market watch scope: the market rows, their recent fills, and their
 * full resting open-order set (the local live book's starting depth), merged
 * into the store. `scope` is a pool-address list, or `"all"` for every
 * eligible market (the all-markets watch; see {@link ELIGIBLE_MARKET_WHERE}).
 *
 * The `"all"` scope hydrates at most {@link ALL_MARKETS_BUDGET} markets, newest
 * first, and sets `truncated` when more eligible markets exist. It takes two
 * requests: {@link ELIGIBLE_MARKETS_QUERY} selects the markets, then one
 * snapshot request reads the seam, the market rows, and the fills and orders
 * of the selected markets. The snapshot request selects the markets again. If
 * that selection names a market the first request did not, the fill and order
 * arms missed it, so the loader repeats the snapshot with the new selection, at
 * most {@link ALL_MARKETS_ATTEMPTS} times.
 *
 * @throws {@link IndexerError} If a request fails, or if the eligible set
 * changes on every attempt.
 */
export async function loadMarketsSnapshot(
  chainId: number,
  scope: string[] | "all",
  deps: {
    indexerUrl: string;
    governor?: GraphqlBoundary.EndpointGovernor;
    /** The owner's pending binding check. Rows merge only after it passes. */
    binding?: Promise<void>;
    store: MaterializerStore;
    isCurrent?: () => boolean;
    includePool?: (pool: string) => boolean;
  },
): Promise<MarketsSnapshotResult> {
  const scoped = scope !== "all";
  // Seed the book with LIVE resting orders only. On-chain expiry is lazy (an
  // expired maker keeps resting with no OrderExpired event — see
  // store.bookLevels), so filtering on status alone would hydrate dead liquidity
  // and let it crowd the per-scope order limit. Cut it off at snapshot time; the
  // live tail's per-block re-derive keeps the book current after the seam. Live
  // means now <= expiry, so `_gte` (matches store.isExpired's strict `>` cutoff).
  const nowNs = (BigInt(Math.floor(Date.now() / 1000)) * 1_000_000_000n).toString();
  const liveExpiry = `expireTimestampNs: {_gte: "${nowNs}"}`;
  const snapshot = (pools: string[], marketIds: string[]) =>
    gql<MarketsSnapshotResponse>(
      deps.indexerUrl,
      marketsSnapshotQuery(scoped, liveExpiry),
      {
        chainId,
        pools,
        ...(scoped ? {} : { marketIds }),
        marketLimit: scoped ? pools.length : ALL_MARKETS_BUDGET + 1,
        // PER-SCOPE budgets, SHARED across the scope's pools — not a per-pool
        // floor. A five-pool watch shares 10,000 orders, so one busy pool can
        // starve its siblings, and `placedAtTimestamp: desc` means what is lost
        // is the OLDEST resting liquidity — which the seam never re-derives
        // (it backfills snapshotBlock+1.. only). A chain seed
        // (`watchMarket(pool, { seed: "chain", marketId })`) has no such cap.
        fillLimit: scoped ? 200 * Math.max(1, pools.length) : 300,
        orderLimit: scoped ? 2000 * Math.max(1, pools.length) : 4000,
      },
      deps.governor,
      deps.binding,
    );

  let data: MarketsSnapshotResponse;
  if (scoped) {
    data = await snapshot(
      scope.map((p) => p.toLowerCase()),
      [],
    );
  } else {
    let selection: readonly { id: string; poolAddress: string }[] = (
      await gql<{ Market: { id: string; poolAddress: string }[] }>(
        deps.indexerUrl,
        ELIGIBLE_MARKETS_QUERY,
        { marketLimit: ALL_MARKETS_BUDGET + 1 },
        deps.governor,
        deps.binding,
      )
    ).Market.slice(0, ALL_MARKETS_BUDGET);
    for (let attempt = 1; ; attempt++) {
      const requested = new Set(selection.map((row) => row.id));
      data = await snapshot(poolsOf(selection), [...requested]);
      const selected = data.Market.slice(0, ALL_MARKETS_BUDGET);
      if (selected.every((row) => requested.has(row.id))) break;
      if (attempt === ALL_MARKETS_ATTEMPTS)
        throw new IndexerError("MarketsSnapshot", "the eligible market set changed during every snapshot attempt");
      selection = selected;
    }
  }

  const seam = seamOf(data.chain_metadata[0]);
  const truncated = !scoped && data.Market.length > ALL_MARKETS_BUDGET;
  const rows = truncated ? data.Market.slice(0, ALL_MARKETS_BUDGET) : data.Market;
  // Stamped with the store's chain, like every row the client returns. The store is the
  // one source of the chain for every row source; `chainId` above only selects the seam row.
  const markets: LiveMarket[] = Markets.withChainRows(deps.store.chainId, Markets.toMarkets(rows));
  // A pool serves successive markets, so two rows can name one pool; the watch set is distinct.
  const selected = [...new Set(markets.map((m) => m.poolAddress.toLowerCase()))];
  // The all-markets fill and order arms are filtered by the requested selection. A market
  // in it can finalize before the snapshot request, which then leaves its pool out. No
  // watch would update or purge that pool's rows, so keep only the selected pools:
  // post-processing of a bounded result (SDK-IO-004).
  const selectedSet = new Set(selected);
  const keep = (pool: string) => (scoped || selectedSet.has(pool)) && deps.includePool?.(pool) !== false;
  if (deps.isCurrent?.() !== false)
    deps.store.mergeSnapshot({
      snapshotBlock: seam.snapshotBlock,
      // Oldest first: the store binds a pool to the market indexed last, which must be the newest.
      markets: markets.filter((row) => keep(row.poolAddress.toLowerCase())).reverse(),
      fills: data.Fill.map((r) => toFill(r, deps.store.chainId)).filter((row) => keep(row.pool.toLowerCase())),
      orders: (data.openOrders ?? [])
        .map((r) => toOrder(r, deps.store.chainId))
        .filter((row) => keep(row.pool.toLowerCase())),
    });

  return {
    ...seam,
    pools: selected,
    marketAddresses: markets.flatMap((m) => (m.marketType === "BINARY" ? [m.marketAddress.toLowerCase()] : [])),
    truncated,
  };
}

interface PoolFillsResponse {
  Fill: RawFill[];
}

/**
 *  Hoisted out of the function so `test/snapshotOperations.test.ts` can validate
 *  it against the committed Hasura schema. These loaders build their GraphQL by
 *  hand rather than through codegen, so `gqlDocumentsValidate` does not see them
 *  and an invalid operation reaches the wire unnoticed.
 */
export const POOL_FILLS_QUERY = `query PoolFills($pools: [String!]!, $fillLimit: Int!) {
      Fill(where: {pool: {_in: $pools}}, order_by: [{timestamp: desc}, {blockNumber: desc}], limit: $fillLimit) { ${FILL_FIELDS} }
    }`;

/**
 *  Recent fills for a pool set, with no market or order rows.
 *
 *  This is the fills half of `loadMarketsSnapshot`, split out so a chain-seeded
 *  watch can load its tape on its own lane. The book it seeds comes from chain,
 *  so this request failing must degrade the tape only — the caller records that
 *  as a `fill-history` failure rather than showing an empty tape as if the
 *  market had never traded (SDK-IO-002).
 *
 *  It takes no `chainId`: the sibling loaders declare `$chainId` only to select
 *  the `chain_metadata` seam row, and a chain-seeded watch pins its seam from
 *  the drained block instead. Declaring it here and never using it makes the
 *  operation invalid GraphQL, which Hasura rejects outright.
 *
 * @throws {@link IndexerError} If the indexer request fails.
 */
export async function loadPoolFills(
  pools: string[],
  deps: {
    indexerUrl: string;
    governor?: GraphqlBoundary.EndpointGovernor;
    /** The owner's pending binding check. Rows merge only after it passes. */
    binding?: Promise<void>;
    store: MaterializerStore;
    isCurrent?: () => boolean;
  },
): Promise<void> {
  const lowered = pools.map((p) => p.toLowerCase());
  const data = await gql<PoolFillsResponse>(
    deps.indexerUrl,
    POOL_FILLS_QUERY,
    {
      pools: lowered,
      fillLimit: 200 * Math.max(1, lowered.length),
    },
    deps.governor,
    deps.binding,
  );
  if (deps.isCurrent?.() === false) return;
  deps.store.mergeSnapshot({ markets: [], fills: data.Fill.map((r) => toFill(r, deps.store.chainId)), orders: [] });
}

/**
 *  Narrow a fills-lane rejection to the typed failure `TailStatus` records.
 *
 *  The lane runs through the shared indexer boundary, so a failure is already
 *  an `IndexerError`. Anything else is wrapped rather than widening the status
 *  type to `unknown` (SDK-ERR-001).
 */
export function toIndexerFailure(error: unknown): IndexerError {
  if (error instanceof IndexerError) return error;
  return new IndexerError("PoolFills", "fill history request failed", { cause: error });
}

interface UserSnapshotResponse {
  chain_metadata: RawChainMeta[];
  userFills: RawFill[];
  userOrders: RawOrder[];
}

/** Hoisted for `test/snapshotOperations.test.ts` — see {@link POOL_FILLS_QUERY}. */
export const USER_SNAPSHOT_QUERY = `query UserSnapshot($chainId: Int!, $user: String!, $userLimit: Int!) {
      ${CHAIN_META}
      userFills: Fill(
        where: {_or: [{maker: {_eq: $user}}, {taker: {_eq: $user}}]},
        order_by: [{timestamp: desc}, {blockNumber: desc}], limit: $userLimit
      ) { ${FILL_FIELDS} }
      userOrders: Order(
        where: {owner: {_eq: $user}},
        order_by: {placedAtTimestamp: desc}, limit: $userLimit
      ) { ${ORDER_FIELDS} }
    }`;

/**
 * Hydrate a user watch scope: the account's past fills (as maker or taker) and
 * orders across ALL markets, merged into the store — so the user-scoped live
 * reads have history predating the watch. Live events are attributed to every
 * account regardless; this only supplies the past.
 */
export async function loadUserSnapshot(
  chainId: number,
  user: string,
  deps: {
    indexerUrl: string;
    governor?: GraphqlBoundary.EndpointGovernor;
    /** The owner's pending binding check. Rows merge only after it passes. */
    binding?: Promise<void>;
    store: MaterializerStore;
    isCurrent?: () => boolean;
  },
): Promise<SnapshotSeam> {
  const data = await gql<UserSnapshotResponse>(
    deps.indexerUrl,
    USER_SNAPSHOT_QUERY,
    {
      chainId,
      user: user.toLowerCase(),
      userLimit: 200,
    },
    deps.governor,
    deps.binding,
  );

  const seam = seamOf(data.chain_metadata[0]);
  if (deps.isCurrent?.() !== false) {
    const orders = data.userOrders.map((r) => toOrder(r, deps.store.chainId));
    deps.store.pinUserHistory(user, orders);
    deps.store.mergeSnapshot({
      snapshotBlock: seam.snapshotBlock,
      markets: [],
      fills: data.userFills.map((r) => toFill(r, deps.store.chainId)),
      orders,
      userHistory: true,
    });
  }
  return seam;
}

// ---------------------------------------------------------------- perp plane

/**
 *  Field sets matching the published `LiquidationEvent` / `FundingPayment` types exactly.
 *
 *  Four indexed columns are deliberately absent (`blockVolume`, `volumeCap`,
 *  `keeperReward`, `panicCode`): `listLiquidations` does not select them either, so the
 *  published type has no home for them and selecting them here would make a hydrated row
 *  carry fields a live one cannot. The two halves of this store must be the same shape.
 */
const LIQUIDATION_FIELDS = `
  id account pool kind size price counterparty penalty
  badDebt insuranceCovered deficit coverageDeclined collateralAmount equity
  positionsProcessed stageReached marginStatusBefore marginStatusAfter
  timestamp blockNumber txHash
`;
const FUNDING_PAYMENT_FIELDS = `id account pool amount timestamp txHash`;

/** What a perp-plane hydration learned, beyond the seam. */
export interface PerpPlaneSnapshotResult extends SnapshotSeam {
  /**
   *  The MarginBank the venue's perp markets name, lowercased — or null when the indexer
   *  has no perp market at all (a fresh reindex, or a chain with no perps).
   *
   *  Returned rather than assumed because the plane's two log sources cannot be watched
   *  without it: the bank address is the entry point, and `MarginBank.getSystemConfig()`
   *  reports the LiquidationEngine from there. Reading it off an indexed row is the
   *  deployment's own view of its wiring, so it cannot drift the way a config constant can.
   */
  marginBank: string | null;
}

interface PerpPlaneSnapshotResponse {
  chain_metadata: RawChainMeta[];
  // The wire rows: the indexer has no chain column, so the loader stamps the store's chain.
  LiquidationEvent: Omit<LiquidationEvent, "chainId">[];
  FundingPayment: Omit<FundingPayment, "chainId">[];
  perpMarket: { marginBank: string | null }[];
}

/**
 *  Hydrate the perp plane: the newest liquidation legs and funding settlements, plus the
 *  MarginBank address the live watch needs, merged into the store.
 *
 *  ONE request, like every other scope loader, and it is the only indexer touch a plane
 *  watch makes. The rows come back in the SAME shape the one-shot reads serve, so the
 *  tail's live rows splice onto them without a translation step.
 *
 *  Plane-wide rather than per pool, because the sources are singletons and the
 *  account-level waterfall legs name no pool. `pool` filtering happens at read time.
 *
 *  Each arm takes the newest rows by the TOTAL key its indexed read serves — the
 *  liquidation arm `(timestamp, blockNumber, id)`, the funding arm `(timestamp, id)`,
 *  since a funding payment has no block column — and the store's comparator sorts on the
 *  same. Ordering on `timestamp` alone picked a different newest-`limit` set at the
 *  boundary, so a hydrated page and a paged history disagreed about which rows exist:
 *  every leg of one waterfall shares a timestamp. Leading on `timestamp` also keeps the
 *  sort on an indexed column, which `blockNumber` alone is not.
 */
export async function loadPerpPlaneSnapshot(
  chainId: number,
  deps: {
    indexerUrl: string;
    /** The owner's pending binding check. Rows merge only after it passes. */
    binding?: Promise<void>;
    store: MaterializerStore;
    limit?: number;
    isCurrent?: () => boolean;
  },
): Promise<PerpPlaneSnapshotResult> {
  const limit = deps.limit ?? 500;
  const data = await gql<PerpPlaneSnapshotResponse>(
    deps.indexerUrl,
    `query PerpPlaneSnapshot($chainId: Int!, $limit: Int!) {
      ${CHAIN_META}
      LiquidationEvent(order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}], limit: $limit) { ${LIQUIDATION_FIELDS} }
      FundingPayment(order_by: [{timestamp: desc}, {id: desc}], limit: $limit) { ${FUNDING_PAYMENT_FIELDS} }
      perpMarket: Market(where: {marketType: {_eq: "PERP"}}, order_by: {createdAtTimestamp: desc}, limit: 1) {
        marginBank
      }
    }`,
    { chainId, limit },
    undefined,
    deps.binding,
  );

  // `isCurrent` is the dispose fence every loader here carries: a hydration that outlived
  // its tail generation must not merge rows into a store the owner has released.
  if (deps.isCurrent?.() !== false)
    deps.store.mergePerpPlaneSnapshot({
      liquidations: data.LiquidationEvent.map((row) => ({ ...row, chainId: deps.store.chainId })),
      fundingPayments: data.FundingPayment.map((row) => ({ ...row, chainId: deps.store.chainId })),
    });

  const bank = data.perpMarket[0]?.marginBank;
  return { ...seamOf(data.chain_metadata[0]), marginBank: bank ? bank.toLowerCase() : null };
}
