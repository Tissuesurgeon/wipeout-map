// Perp PROTOCOL state — the plane below any one account or market.
//
// PERP-ONLY. What the protocol repo's `perps:state` / `perps:health` ops tasks read
// when answering "is this stack wired and solvent", as opposed to "how is this
// trader doing". Three contracts: the MarginBank's own wiring, the InsuranceFund
// backing it, and the LiquidationEngine's configured bounds.
//
// Deliberately NOT here: the SimPerpMarketMaker / SimPerpTaker actors that drive
// testnet flow. Those are simulation scaffolding, not protocol.
//
// Oracle surfaces used to be excluded wholesale by this note. That was too broad and
// the exclusion is now narrower: a POOL's aggregator oracle address is protocol truth,
// so `getPerpState` reports it (see PerpStateOnchain.oracle). It is the head of the
// price chain the pool itself reads, and it belongs to the address book for the same
// reason `liquidationEngine` and `insuranceFund` below do — a consumer should never
// hardcode it per chain. It stays on the per-pool state read rather than moving here
// because it is per-pool, not per-system: every live pool reports a different one.
// What remains excluded is the simulation scaffolding: the sim-controlled oracle and
// the agent EMA feed the aggregator chains to, and the sim actors above.

import type { Address, PublicClient } from "viem";
import { graphql } from "../gql/gql.js";
import * as IndexerRead from "../indexerRead.js";
import * as ReadsAbi from "../readsAbi.js";

/**
 *  How the perps stack is wired, straight from `MarginBank.getSystemConfig`.
 *
 *  This is the address book. Every other contract in the plane is reachable from
 *  here, so a consumer never hardcodes one per chain — and the bank's own view of
 *  them is the authoritative one, since these are the addresses it will actually
 *  call.
 *
 * @category perpetual markets
 */
export interface PerpSystemConfig {
  /** The MarginBank reporting this config (echoed back). */
  marginBank: Address;
  /** The single collateral token every perp market is quoted in. */
  collateralToken: Address;
  /** The factory that deploys PerpPools. */
  perpPoolFactory: Address;
  /** The LiquidationEngine — the PROXY, which is what to call. */
  liquidationEngine: Address;
  /** The tiered InsuranceFund that absorbs bad debt. */
  insuranceFund: Address;
  /** Where protocol fees are routed. */
  feeRecipient: Address;
  /** Protocol-wide ceiling on per-account leverage; clamps a stricter user setting. */
  maxLeverageLimit: number;
  /**
   *  Whether the factory, liquidation engine and insurance fund are all set.
   *
   *  **`feeRecipient` is NOT part of it**, despite sitting in the same struct — the
   *  contract's flag covers three of the five addresses above. A go-live check that
   *  read this as "everything is configured" would sign off a stack whose fee routing
   *  is still unset, so check {@link feeRecipient} separately.
   *
   *  False means some part of the stack is half-configured, which is the state in
   *  which liquidation or settlement paths degrade silently rather than reverting.
   */
  fullyWired: boolean;
}

/**
 * One tier of the InsuranceFund.
 *
 * @category perpetual markets
 */
export interface InsuranceFundTier {
  /**
   *  Tier index. `0` is the general/unallocated bucket — a reserved sentinel that
   *  never absorbs bad debt and backs no pools (its {@link poolCount} is structurally
   *  zero, since tier 0 means "uncovered" and is not tracked). Coverage tiers run
   *  `1..maxTiers`.
   */
  tier: number;
  /** Collateral held in this tier, raw units. */
  balance: bigint;
  /** How many perp pools this tier backs. */
  poolCount: bigint;
}

/**
 * The InsuranceFund's solvency picture.
 *
 * @category perpetual markets
 */
export interface InsuranceFundState {
  /**
   *  The fund's address.
   */
  address: Address;
  /**
   *  The maximum tier INDEX, not a count — the fund has `maxTiers + 1` addressable
   *  buckets, because tier 0 exists alongside coverage tiers `1..maxTiers`.
   */
  maxTiers: bigint;
  /**
   *  Sum across every tier including tier 0, raw collateral units — the contract's own
   *  `getTotalTierBalances`, which is the figure the INV-TIER accounting invariant is
   *  stated against.
   *
   *  **Not "how much bad debt this stack can absorb"**, on two counts. Tier 0 is
   *  included here but never absorbs anything, so collateral parked there inflates the
   *  number without backing a single market. And each coverage tier is charged only
   *  its own pools' realized losses, capped at `min(funded, own loss)` and never
   *  subsidising another tier — so even the `1..maxTiers` sum is an upper bound that
   *  no single event can draw down in full. For absorption against a specific market,
   *  read that market's tier from {@link tiers}.
   */
  totalBalance: bigint;
  /** Per-tier balances and how many pools each backs, tier 0 first. */
  tiers: InsuranceFundTier[];
}

/**
 *  The LiquidationEngine's CONFIGURED bounds — not its history, which is indexed as
 *  `LiquidationEvent`.
 *
 * @category perpetual markets
 */
export interface LiquidationEngineConfig {
  /** The engine's address. */
  address: Address;
  /** The MarginBank it liquidates against — cross-check against the system config. */
  marginBank: Address;
  /** Penalty charged on a liquidation, bps. */
  penaltyBps: bigint;
  /** Lower bound on the liquidation spread, bps. */
  minSpreadBps: bigint;
  /** Upper bound on the liquidation spread, bps. */
  maxSpreadBps: bigint;
  /** Per-block cap on liquidated notional, raw quote units — the throughput throttle. */
  maxVolumePerBlock: bigint;
  /**
   *  Registered stage-4 backstop bidders.
   *
   *  Zero is a real operational signal, not just a statistic: with no bidders the
   *  takeover stage has nobody to take a position over, so the waterfall falls
   *  through to ADL sooner.
   */
  bidderCount: bigint;
}

/**
 *  How the perps stack is wired — the address book for every other contract in the
 *  plane, plus the `fullyWired` health flag.
 *
 *  Chain tier. Read this first: `liquidationEngine` and `insuranceFund` from here are
 *  what {@link getLiquidationEngineConfig} and {@link getInsuranceFundState} should be
 *  pointed at, so nothing is hardcoded per chain.
 *
 *  Note `liquidationEngine` is the PROXY. An implementation address (what a bytecode
 *  drift check reports) answers reads with unset defaults — zero bidders, zero
 *  penalty — which looks like a configured-but-empty engine rather than the wrong
 *  address.
 */
export async function getPerpSystemConfig(marginBank: Address, client: PublicClient): Promise<PerpSystemConfig> {
  const c = await client.readContract({
    address: marginBank,
    abi: ReadsAbi.marginBankReadAbi,
    functionName: "getSystemConfig",
  });
  return {
    marginBank: c.marginBank,
    collateralToken: c.collateralToken,
    perpPoolFactory: c.perpPoolFactory,
    liquidationEngine: c.liquidationEngine,
    insuranceFund: c.insuranceFund,
    feeRecipient: c.feeRecipient,
    maxLeverageLimit: c.maxLeverageLimit,
    fullyWired: c.fullyWired,
  };
}

/**
 *  The InsuranceFund's per-tier balances and the total it can absorb.
 *
 *  Chain tier. `address` comes from {@link getPerpSystemConfig}. Tiers are read in one
 *  fan-out after `getMaxTiers`, so the per-tier figures share a view of the tier count.
 */
export async function getInsuranceFundState(fund: Address, client: PublicClient): Promise<InsuranceFundState> {
  const f = { address: fund, abi: ReadsAbi.insuranceFundReadAbi } as const;
  const [maxTiers, totalBalance] = await Promise.all([
    client.readContract({ ...f, functionName: "getMaxTiers" }),
    client.readContract({ ...f, functionName: "getTotalTierBalances" }),
  ]);
  // `maxTiers` is the maximum tier INDEX, not a count: tier 0 is the general bucket
  // and coverage tiers run 1..maxTiers, so the fund has maxTiers + 1 addressable
  // buckets. The contract's own `getTotalTierBalances` loops `t <= maxTiers` — walking
  // a bare `length: maxTiers` stopped one short and made the LAST coverage tier
  // permanently invisible, so a funded tier would be missing from the breakdown while
  // still counted in `totalBalance`.
  const indices = Array.from({ length: Number(maxTiers) + 1 }, (_, i) => BigInt(i));
  const tiers = await Promise.all(
    indices.map(async (tier) => {
      const [balance, poolCount] = await Promise.all([
        client.readContract({ ...f, functionName: "getTierBalance", args: [tier] }),
        client.readContract({ ...f, functionName: "getPoolCountForTier", args: [tier] }),
      ]);
      return { tier: Number(tier), balance, poolCount };
    }),
  );
  return { address: fund, maxTiers, totalBalance, tiers };
}

/**
 *  The LiquidationEngine's configured bounds.
 *
 *  Chain tier. `address` comes from {@link getPerpSystemConfig} — and must be the
 *  proxy, since an implementation address answers with unset defaults that read as a
 *  configured-but-idle engine.
 *
 *  `bidderCount === 0n` is worth surfacing: with no registered backstop bidders the
 *  takeover stage has nobody to take a position over, so the waterfall reaches ADL
 *  sooner than the configuration implies.
 */
export async function getLiquidationEngineConfig(
  engine: Address,
  client: PublicClient,
): Promise<LiquidationEngineConfig> {
  const e = { address: engine, abi: ReadsAbi.liquidationEngineReadAbi } as const;
  const [marginBank, penaltyBps, minSpreadBps, maxSpreadBps, maxVolumePerBlock, bidderCount] = await Promise.all([
    client.readContract({ ...e, functionName: "getMarginBank" }),
    client.readContract({ ...e, functionName: "getLiquidationPenaltyBps" }),
    client.readContract({ ...e, functionName: "getMinLiquidationSpreadBps" }),
    client.readContract({ ...e, functionName: "getMaxLiquidationSpreadBps" }),
    client.readContract({ ...e, functionName: "getMaxLiquidationVolumePerBlock" }),
    client.readContract({ ...e, functionName: "getBidderCount" }),
  ]);
  return { address: engine, marginBank, penaltyBps, minSpreadBps, maxSpreadBps, maxVolumePerBlock, bidderCount };
}

/**
 *  An account's equity without the revert — `null` when the read could not complete.
 *
 *  Chain tier. `getAccountHealth` propagates an oracle failure, which is exactly when
 *  a health sweep most needs an answer; this reports it as `null` instead. Null means
 *  "not computable right now" (an unpriceable market in the account's set), never
 *  "zero equity".
 */
export async function tryGetPerpAccountEquity(
  marginBank: Address,
  account: Address,
  client: PublicClient,
): Promise<bigint | null> {
  const [ok, equity] = await client.readContract({
    address: marginBank,
    abi: ReadsAbi.marginBankReadAbi,
    functionName: "tryGetAccountEquity",
    args: [account],
  });
  return ok ? equity : null;
}

/**
 *  Collateral BACKING an account: `max(0, unlocked + locked)`, raw units.
 *
 *  Chain tier. Deliberately unlike equity — one storage pair, no market walk, no
 *  oracle, and it cannot revert. Use it when you need a solvency floor that survives
 *  a dead price feed; use equity when you need mark-to-market truth.
 */
export async function getPerpCollateralBasis(
  marginBank: Address,
  account: Address,
  client: PublicClient,
): Promise<bigint> {
  return client.readContract({
    address: marginBank,
    abi: ReadsAbi.marginBankReadAbi,
    functionName: "getCollateralBasis",
    args: [account],
  });
}

// ------------------------------------------------- the insurance fund's tier ledger
//
// INDEXER tier, and the append-only counterpart to `getInsuranceFundState` above. The
// split is the usual one: the chain read answers "what does each tier hold RIGHT NOW",
// which is live state a replayed log can only approximate, while this answers "how did
// it get there", which the chain cannot answer at all because a balance keeps no
// history of the flows that produced it.

/**
 *  One movement in the InsuranceFund's tier ledger (mirror of the indexer
 *  `PerpInsuranceFundEvent` entity).
 *
 *  Eight kinds share this row, and they are NOT interchangeable — most fields are
 *  populated for some kinds and null for the rest, so {@link PerpInsuranceFundEvent.kind}
 *  is the field to branch on first:
 *
 *  | `kind` | What it records | Effect on the fund total |
 *  |---|---|---|
 *  | `BadDebtAuthorised` | coverage asked for and granted, per account | none — a summary |
 *  | `TierFunded` | a plain top-up | inflow |
 *  | `TierFundedFromSource` | a top-up drawn from the configured funding source | inflow |
 *  | `TierCredited` | the insurance share of a fee, booked by MarginBank | inflow |
 *  | `TierDebited` | the liquidation waterfall drew from a tier | outflow |
 *  | `TierWithdrawn` | an admin withdrawal | outflow |
 *  | `TierWithdrawnToTreasury` | an admin withdrawal routed to the treasury | outflow |
 *  | `TierAllocated` | a transfer from `tier` to `toTier` | **none** |
 *
 *  **Gotchas.**
 *
 *  - **Never sum `amount` bare.** It is populated on inflows, outflows and the internal
 *    move alike, so a plain total is gross turnover rather than a net position. Fold it
 *    BY `kind` using the table above, and remember `TierAllocated` nets to zero across
 *    the fund even though it moves wei between two tiers.
 *  - **`covered` is not an independent flow.** On a `BadDebtAuthorised` row it is the SUM
 *    of the `TierDebited` rows in the same transaction, so counting both double-counts
 *    the same wei. `requested > covered` is a PARTIAL grant, and `covered === "0"` is a
 *    REFUSAL — the only record the protocol keeps of one.
 *  - **`TierCredited` is a cross-plane duplicate.** It restates wei already recorded as
 *    `insurancePortion` on the fee plane ({@link SomniaMarketsClient.listPerpFees | client.listPerpFees}),
 *    because
 *    `MarginBank._chargeFee` transfers the insurance share and then books the tier credit
 *    for the same amount. What this row adds is WHICH TIER received it, which the fee
 *    plane does not carry. Do not add the two together.
 *  - `kind` is a raw string, not a decoded union, for the same reason `Order.cancelReason`
 *    is: the vocabulary is the indexer's own — eight distinct events rather than a
 *    contract enum arriving as a `uint8` — so there is nothing to decode, and a kind a
 *    newer indexer emits reaches a consumer intact rather than becoming null.
 *
 * @category perpetual markets
 */
export type PerpInsuranceFundEvent = {
  /** Row id (`${txHash}_${logIndex}`). */
  id: string;
  /** Which of the eight movements this row is — branch on this before reading any other field. */
  kind: string;
  /**
   *  The tier this row moves, or the SOURCE tier on `TierAllocated`. Null on
   *  `BadDebtAuthorised`, which is account-scoped rather than tier-scoped.
   */
  tier: string | null;
  /** The DESTINATION tier (`TierAllocated` only). */
  toTier: string | null;
  /**
   *  Wei that actually MOVED, raw collateral units. Null on `BadDebtAuthorised`. Fold by
   *  `kind` — see the type note; a bare sum is turnover, not a balance.
   */
  amount: string | null;
  /** Coverage ASKED FOR (`BadDebtAuthorised` only). */
  requested: string | null;
  /**
   *  Coverage GRANTED (`BadDebtAuthorised` only) — the sum of the same-transaction
   *  `TierDebited` rows rather than an independent flow. `"0"` is a refusal.
   */
  covered: string | null;
  /** The account whose bad debt was authorised (`BadDebtAuthorised` only), lowercased. */
  account: string | null;
  /** The funding source or the treasury, where the event names one (lowercased). */
  counterparty: string | null;
  /** Who triggered it, where the event names a caller distinct from the counterparty. */
  caller: string | null;
  /** Timestamp (unix seconds) of the movement. */
  timestamp: string;
  /** Block the movement landed in. */
  blockNumber: string;
  /**
   *  Position within the block. Load-bearing for ordering, not decoration: one
   *  authorisation debits SEVERAL tiers in the same block and transaction, and `id` leads
   *  with an unordered transaction hash, so nothing else can rank them.
   */
  logIndex: number;
  /** Tx hash the movement landed in. */
  txHash: string;
};

// prettier-ignore
const PerpInsuranceFundEventsQuery = graphql(`
  query PerpInsuranceFundEvents($where: PerpInsuranceFundEvent_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         PerpInsuranceFundEvent(where: $where, order_by: [{blockNumber: desc}, {logIndex: desc}], limit: $limit, offset: $offset) {
           id kind tier toTier amount requested covered account counterparty caller
           timestamp blockNumber logIndex txHash
         }
       }
`);

/**
 *  The InsuranceFund's tier ledger, newest first — how each tier reached the balance
 *  {@link getInsuranceFundState} reports.
 *
 *  Indexer tier. Filter by `kind`, by `tier`, or by the `account` a bad-debt
 *  authorisation names; omit them all for the whole fund. Every filter runs at the
 *  indexer against an indexed column.
 *
 *  Ordered by `(blockNumber, logIndex)` descending — true chain order, which is what this
 *  ledger needs. One authorisation debits several tiers in the SAME TRANSACTION, and
 *  `covered` on the `BadDebtAuthorised` row is the sum of exactly those `TierDebited`
 *  rows, so their relative order is part of reading the waterfall correctly. Not
 *  `timestamp`, alone or paired with `logIndex`: separate blocks can share a timestamp
 *  while `logIndex` restarts in each, so that sort interleaves rows across blocks and
 *  `offset` paging can then repeat or drop one.
 *
 *  **Read {@link PerpInsuranceFundEvent}'s gotchas before aggregating.** `amount` must be
 *  folded by `kind`, `covered` restates the `TierDebited` rows beside it, and
 *  `TierCredited` duplicates the fee plane's `insurancePortion`.
 *
 * @example What the waterfall actually drew from tier 1
 * ```ts
 * const debits = await client.listPerpInsuranceFundEvents({ kind: "TierDebited", tier: 1 });
 * const drawn = debits.reduce((t, r) => t + BigInt(r.amount ?? "0"), 0n);
 * ```
 *
 * @example Find the refusals — the only record the protocol keeps of one
 * ```ts
 * const authorisations = await client.listPerpInsuranceFundEvents({ kind: "BadDebtAuthorised" });
 * const refused = authorisations.filter((r) => r.covered === "0");
 * ```
 */
export async function listPerpInsuranceFundEvents(
  opts: { kind?: string; tier?: number | bigint; account?: string; limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<PerpInsuranceFundEvent[]> {
  const where: Record<string, unknown> = {};
  if (opts.kind != null) where.kind = { _eq: opts.kind };
  // A tier is a number on the wire and 0 is a real tier — the general bucket — so this
  // has to test presence rather than truthiness or the most common tier is unfilterable.
  if (opts.tier != null) where.tier = { _eq: opts.tier.toString() };
  if (opts.account != null) where.account = { _eq: opts.account.toLowerCase() };
  const data = await IndexerRead.gqlRequest(
    PerpInsuranceFundEventsQuery,
    { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.PerpInsuranceFundEvent;
}
