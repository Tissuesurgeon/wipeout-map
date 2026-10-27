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
import { graphql } from "../gql/gql.js";
import * as IndexerRead from "../indexerRead.js";
import * as ReadsAbi from "../readsAbi.js";
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
export async function getPerpSystemConfig(marginBank, client) {
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
export async function getInsuranceFundState(fund, client) {
    const f = { address: fund, abi: ReadsAbi.insuranceFundReadAbi };
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
    const tiers = await Promise.all(indices.map(async (tier) => {
        const [balance, poolCount] = await Promise.all([
            client.readContract({ ...f, functionName: "getTierBalance", args: [tier] }),
            client.readContract({ ...f, functionName: "getPoolCountForTier", args: [tier] }),
        ]);
        return { tier: Number(tier), balance, poolCount };
    }));
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
export async function getLiquidationEngineConfig(engine, client) {
    const e = { address: engine, abi: ReadsAbi.liquidationEngineReadAbi };
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
export async function tryGetPerpAccountEquity(marginBank, account, client) {
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
export async function getPerpCollateralBasis(marginBank, account, client) {
    return client.readContract({
        address: marginBank,
        abi: ReadsAbi.marginBankReadAbi,
        functionName: "getCollateralBasis",
        args: [account],
    });
}
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
export async function listPerpInsuranceFundEvents(opts = {}, indexerUrl) {
    const where = {};
    if (opts.kind != null)
        where.kind = { _eq: opts.kind };
    // A tier is a number on the wire and 0 is a real tier — the general bucket — so this
    // has to test presence rather than truthiness or the most common tier is unfilterable.
    if (opts.tier != null)
        where.tier = { _eq: opts.tier.toString() };
    if (opts.account != null)
        where.account = { _eq: opts.account.toLowerCase() };
    const data = await IndexerRead.gqlRequest(PerpInsuranceFundEventsQuery, { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 }, indexerUrl);
    return data.PerpInsuranceFundEvent;
}
