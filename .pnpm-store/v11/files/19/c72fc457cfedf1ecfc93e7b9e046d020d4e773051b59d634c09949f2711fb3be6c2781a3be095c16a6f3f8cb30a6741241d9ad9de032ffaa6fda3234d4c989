// The unified trading account — reading the linked-wallet funding rail (DEX-2361).
//
// PERP-ONLY, and TWO TIERS. The split is by QUESTION, not by what happens to be
// available, which is why both live here rather than in separate modules:
//
//   CHAIN   — "what is outstanding RIGHT NOW", and "will this order spend my main's
//             wallet". Live state that a replayed log can only approximate, so these
//             stay bank and registry reads even though the events are indexed.
//   INDEXER — "how did it get there". Every proposal, link, pull, settle and return,
//             append-only, in `PerpWalletLinkEvent`, `PerpMarginPull` and
//             `PerpMainFundingEvent`. The chain keeps no history of any of it.
//
// THE TWO LEDGERS ARE SPLIT BY SIDE AND MUST NOT BE SUMMED TOGETHER. A MAIN-funded leg
// emits a POOL event and a BANK event for the same wei, so adding `listPerpMarginPulls`
// to `listPerpMainFundingEvents` double-counts every main-funded transfer. They carry
// different unique content — the pool side names the ORDER, the bank side carries the
// running CLAIM — and that is the reason to read one or the other, never both as one
// total.
//
// The overlap is the MAIN legs and no more. An own-wallet pull has no bank-side twin:
// the bank's `DepositedFor` is deliberately not subscribed, because the pool's
// `MarginAutoPulled` already carries the same amount plus the order id. So
// `PerpMainFundingEvent` covers the main legs only, while `PerpMarginPull` covers both.
//
// WHY THIS EXISTS AT ALL. True isolation on perps needs one account per isolated
// position — "isolated margin" is single-market confinement, not a per-position
// collateral bucket — so N isolated positions mean N wallets. That used to make every
// sub-account its own treasury operation. Linking the wallets lets a child's
// position-increasing order draw the shortfall from its MAIN's wallet, so one treasury
// serves N buckets.
//
// TWO LAYERS, AND THEY ARE NOT THE SAME QUESTION.
//
//   1. The registry (`LinkedWalletRegistry`) is the CONSENT graph — who is linked to
//      whom. Being linked grants no authority over funds by itself.
//   2. The bank (`MarginBank`) is the MONEY layer, and it is what has to be armed:
//      until `getLinkedWalletRegistry()` is non-zero the rail is dormant and no child
//      can draw on any main no matter what the registry says.
//
// So "are we linked" and "will this order spend my main's wallet" are different reads,
// and {@link quotePerpFundingPayer} answers the second one directly rather than making
// a caller compose the first with an arming check.

import type { Address, PublicClient } from "viem";
import { graphql } from "../gql/gql.js";
import * as IndexerRead from "../indexerRead.js";
import * as ReadsAbi from "../readsAbi.js";
import * as TradeAbi from "../tradeAbi.js";
import * as Writer from "../writer.js";
import { InvalidInputError } from "../errors.js";
import type { Writer as WriterCtx } from "../writer.js";
import type {
  AcceptPerpWalletLinkParams,
  CancelPerpWalletLinkProposalParams,
  PerpWalletLinkTarget,
  ProposePerpWalletLinkParams,
  RecallPerpMainFundingParams,
  RepayPerpMainFundingParams,
  TxResult,
  UnlinkPerpWalletParams,
} from "../trade.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 *  Whether a child's next position-increasing order would draw on a main's wallet,
 *  and whose.
 *
 *  A discriminated union rather than a bare address, because zero from
 *  `quoteFundingPayer` collapses three genuinely different situations that a UI must
 *  not render identically: the rail is dormant, this wallet is unlinked, or this
 *  wallet IS a main. Narrow on `funded` first.
 *
 * @category perpetual markets
 */
export type PerpFundingPayer =
  | {
      /** A main would be debited for whatever this account's own wallet cannot cover. */
      funded: true;
      /**
       *  The main whose wallet would be debited. This is the live resolution, not the
       *  snapshot a past pull recorded — see {@link PerpMainFunding.payer} for that,
       *  and note the two can differ after an unlink and re-link.
       */
      payer: Address;
    }
  | {
      /**
       *  No main would be debited. `reason` says which of the three cases applies;
       *  only `unlinked` is something the user can change by linking.
       */
      funded: false;
      /**
       *  - `dormant` — the bank holds no registry address, so the feature is off for
       *    everyone on this deployment. Linking would not help.
       *  - `unlinked` — the rail is armed but this wallet has no main.
       *  - `isMain` — this wallet resolves to itself. Mains fund children, not the
       *    reverse; funding flows main->child only.
       */
      reason: "dormant" | "unlinked" | "isMain";
    };

/**
 *  The outstanding claim against a child, and who it is owed to.
 *
 *  What a main funds can be BORROWED, NEVER WITHDRAWN: `withdraw` pays the child at
 *  most `balance - principal`, so a compromised child key can trade the money and lose
 *  it but cannot take it out.
 *
 * @category perpetual markets
 */
export interface PerpMainFunding {
  /**
   *  Principal a main has funded and not yet recovered, in collateral units. Zero
   *  means nothing is outstanding.
   *
   *  It is NOT a segregated bucket. The child's own money and its main's are one
   *  fungible balance, and the claim is clamped to `min(principal, balance)` at flat
   *  moments — so the child's own contribution is the JUNIOR tranche and a loss eats
   *  it first. A child that genuinely lost the money does not owe it forever.
   */
  principal: bigint;
  /**
   *  The payer recorded AT FUNDING TIME, or zero when nothing is outstanding.
   *
   *  Snapshotted deliberately: both routes home settle against this address, so an
   *  unlink or re-link between the pull and the repayment cannot misroute the money to
   *  whoever happens to be linked later. When this disagrees with the LIVE resolution
   *  ({@link PerpFundingPayer}), THIS is who gets repaid.
   */
  payer: Address;
  /**
   *  How much of `principal` the child could withdraw: always zero while a claim
   *  stands, and present as a field only so a caller does not have to re-derive the
   *  rule from prose. Included because "why can I not withdraw my balance" is the
   *  commonest question this surface has to answer.
   */
  readonly withdrawableFromPrincipal: 0n;
}

/**
 *  A link group, with the maturity the raw graph does not carry.
 *
 *  `maturesAt` matters for a reason worth stating: ADL netting is gated on maturity so
 *  that a link armed in reaction to an impending auto-deleveraging cannot buy netting
 *  credit. The FUNDING rail deliberately reads the raw graph instead, because the main
 *  proposed the link and owns the allowance, and there is no analogous surprise. So a
 *  link can be fundable and not yet mature — do not use `maturesAt` to decide whether
 *  a pull will happen.
 *
 * @category perpetual markets
 */
export interface PerpWalletLinkage {
  /** The group's main. Zero when the wallet is unlinked. */
  main: Address;
  /** The main plus every child. Empty when the wallet is unlinked. */
  members: readonly Address[];
  /** Unix seconds the link was formed, or 0. */
  linkedAt: bigint;
  /** Unix seconds the link becomes mature FOR ADL NETTING, or 0. Not a funding gate. */
  maturesAt: bigint;
  /** Convenience: whether this wallet is a child (has a main that is not itself). */
  isChild: boolean;
  /** Convenience: whether this wallet is a main with at least one child. */
  isMain: boolean;
}

/**
 *  The registry the bank resolves links through, or `null` while the rail is dormant.
 *
 *  Chain tier. Read this from the BANK rather than from a deployment manifest: the
 *  bank is what decides which registry is authoritative, and a registry nobody has
 *  armed is inert. `null` here means every other read in this module will report
 *  "not funded" regardless of what any registry contains.
 */
export async function getPerpLinkedWalletRegistry(marginBank: Address, client: PublicClient): Promise<Address | null> {
  const registry = await client.readContract({
    address: marginBank,
    abi: ReadsAbi.marginBankReadAbi,
    functionName: "getLinkedWalletRegistry",
  });
  return registry === ZERO_ADDRESS ? null : registry;
}

/**
 *  Will this account's next position-increasing order spend a main's wallet, and whose?
 *
 *  Chain tier. Two reads, because the contract's single zero cannot distinguish
 *  "dormant" from "unlinked" and a UI has to: one of those is the user's to fix by
 *  linking, the other is not.
 *
 *  The arming check is done FIRST and short-circuits, so a deployment with the rail off
 *  costs one read and never reports a misleading `unlinked`.
 */
export async function quotePerpFundingPayer(
  marginBank: Address,
  account: Address,
  client: PublicClient,
): Promise<PerpFundingPayer> {
  const registry = await getPerpLinkedWalletRegistry(marginBank, client);
  if (registry === null) return { funded: false, reason: "dormant" };

  const payer = await client.readContract({
    address: marginBank,
    abi: ReadsAbi.marginBankReadAbi,
    functionName: "quoteFundingPayer",
    args: [account],
  });
  if (payer !== ZERO_ADDRESS) return { funded: true, payer };

  // The bank returned zero with the rail armed, so it is the graph that declines. Ask
  // the registry which way: a wallet that resolves to ITSELF is a main (funding flows
  // main->child only), and anything else is genuinely unlinked.
  const main = await client.readContract({
    address: registry,
    abi: ReadsAbi.linkedWalletRegistryReadAbi,
    functionName: "mainOf",
    args: [account],
  });
  return { funded: false, reason: main === account ? "isMain" : "unlinked" };
}

/**
 *  What a main has funded into a child and not yet recovered.
 *
 *  Chain tier, two reads batched. Safe to call on any account — a wallet that has
 *  never been funded reports zero principal and a zero payer rather than reverting.
 */
export async function getPerpMainFunding(
  marginBank: Address,
  account: Address,
  client: PublicClient,
): Promise<PerpMainFunding> {
  const bank = { address: marginBank, abi: ReadsAbi.marginBankReadAbi } as const;
  const [principal, payer] = await Promise.all([
    client.readContract({ ...bank, functionName: "getMainFundedPrincipal", args: [account] }),
    client.readContract({ ...bank, functionName: "getMainFundingPayer", args: [account] }),
  ]);
  return { principal, payer, withdrawableFromPrincipal: 0n };
}

/**
 *  What a wallet could actually contribute to a pull right now — `min(balance,
 *  allowance)`, in collateral units.
 *
 *  Chain tier. This is why a child holding no ERC20 approval contributes zero rather
 *  than reverting the order: the rail SIZES its own contribution with this figure
 *  instead of attempting a transfer and failing.
 *
 *  Read it two ways, and they answer different questions. On the MAIN it is the ceiling
 *  on what its children can collectively draw — and the number a main reduces to revoke
 *  the rail without unlinking, since consent is the allowance. On the CHILD it is how
 *  much of its own money it will burn before reaching its main's.
 */
export async function getPerpWalletPullCapacity(
  marginBank: Address,
  wallet: Address,
  client: PublicClient,
): Promise<bigint> {
  return client.readContract({
    address: marginBank,
    abi: ReadsAbi.marginBankReadAbi,
    functionName: "quoteWalletCapacity",
    args: [wallet],
  });
}

/**
 *  A wallet's link group and its ADL-netting maturity.
 *
 *  Chain tier, one read. Takes the REGISTRY address, not the bank — resolve it with
 *  {@link getPerpLinkedWalletRegistry} so a dormant deployment is visible as such
 *  rather than as an empty group.
 *
 *  `isChild` / `isMain` are derived here because the raw encoding is a trap: a main
 *  resolves to ITSELF in `mainOf`, so the natural test `main !== zero` is true for
 *  mains and children alike.
 */
export async function getPerpWalletLinkage(
  registry: Address,
  wallet: Address,
  client: PublicClient,
): Promise<PerpWalletLinkage> {
  const linkage = await client.readContract({
    address: registry,
    abi: ReadsAbi.linkedWalletRegistryReadAbi,
    functionName: "linkageOf",
    args: [wallet],
  });
  const main = linkage.main;
  const linked = main !== ZERO_ADDRESS;
  return {
    main,
    members: linkage.members,
    linkedAt: BigInt(linkage.linkedAt),
    maturesAt: BigInt(linkage.maturesAt),
    isChild: linked && main !== wallet,
    isMain: linked && main === wallet && linkage.members.length > 1,
  };
}

/**
 *  Every child of a main, excluding the main itself.
 *
 *  Chain tier. Bounded by the registry's `maxChildren`, so this is the list of isolated
 *  buckets one treasury currently serves.
 */
export async function listPerpLinkedChildren(
  registry: Address,
  main: Address,
  client: PublicClient,
): Promise<readonly Address[]> {
  return client.readContract({
    address: registry,
    abi: ReadsAbi.linkedWalletRegistryReadAbi,
    functionName: "childrenOf",
    args: [main],
  });
}

/**
 *  How many children one main may hold — the cap on isolated buckets per treasury.
 *
 *  Chain tier. Worth reading before offering to link another wallet, since the cap is
 *  owner-tunable and a client that hardcodes it will offer a link the registry refuses.
 */
export async function getPerpMaxLinkedChildren(registry: Address, client: PublicClient): Promise<bigint> {
  return client.readContract({
    address: registry,
    abi: ReadsAbi.linkedWalletRegistryReadAbi,
    functionName: "maxChildren",
  });
}

// ------------------------------------------------------------ the indexed history
//
// INDEXER tier. Three append-only streams, each answering a question no chain read can:
// the CONSENT graph over time, the PULLS that funded placements, and the running CLAIM
// against a child. See the module header for why the last two must never be summed.

/**
 *  One state change in the linked-wallet consent graph (mirror of the indexer
 *  `PerpWalletLinkEvent` entity).
 *
 *  Four kinds, and one of them is the only record that exists:
 *
 *  - `Proposed` — a main offered a link. **The registry has no getter for a pending
 *    proposal**, so this row is the ONLY way a child learns one was made. Without it a
 *    pending offer is invisible to everything off-chain.
 *  - `ProposalCancelled` — the main withdrew the offer before it was accepted. A client
 *    showing an inbox must apply this, or it keeps offering a link that no longer stands.
 *  - `Linked` — the child accepted; the group exists from here.
 *  - `Unlinked` — either side tore the link down. Consent for the funding rail IS the link
 *    plus the allowance, with no separate opt-out flag, so this is the revocation event.
 *
 *  **Gotcha.** This is the CONSENT graph, not the money layer. A `Linked` row grants no
 *  authority over funds by itself — the rail is dormant until the bank's
 *  `getLinkedWalletRegistry()` is non-zero and the main has given an allowance. Ask
 *  {@link SomniaMarketsClient.quotePerpFundingPayer | client.quotePerpFundingPayer} whether an
 *  order would actually spend a main's wallet; do not infer it from a link.
 *
 * @category perpetual markets
 */
export type PerpWalletLinkEvent = {
  /** Row id (`${txHash}_${logIndex}`). */
  id: string;
  /** `Proposed` | `ProposalCancelled` | `Linked` | `Unlinked`. */
  kind: string;
  /** The main side of the pair (lowercased) — present on every kind. */
  main: string;
  /** The child side of the pair (lowercased) — present on every kind. */
  child: string;
  /** Timestamp (unix seconds) of the change. */
  timestamp: string;
  /** Block the change landed in. */
  blockNumber: string;
  /** Position within the block — needed to order two changes to the same pair in one block. */
  logIndex: number;
  /** Tx hash the change landed in. */
  txHash: string;
};

/**
 *  One leg of margin pulled to fund a placement (mirror of the indexer `PerpMarginPull`
 *  entity). **Pool side.**
 *
 *  `source` names which wallet paid, and one placement can produce BOTH legs, in this
 *  order:
 *
 *  - `OwnWallet` — the owner's own wallet funded it, sized by `min(balance, allowance)`.
 *  - `Main` — the residual reached the owner's linked MAIN, whose address is `payer`.
 *
 *  So a child with no approval of its own contributes zero and the whole requirement
 *  arrives as one `Main` leg, while a partly-funded child produces two rows for one
 *  order. `amount` is what THIS leg pulled, never the order's total requirement — sum the
 *  legs sharing an `orderId` for that.
 *
 *  **Gotcha.** Do not add these to {@link PerpMainFundingEvent} rows: the same wei appears
 *  on both sides. See the module header.
 *
 * @category perpetual markets
 */
export type PerpMarginPull = {
  /** Row id (`${txHash}_${logIndex}`). */
  id: string;
  /** The account credited, and whose position the order was for (lowercased). */
  account: string;
  /** The PerpPool that pulled (lowercased). */
  pool: string;
  /** The order whose placement caused the pull — decimal string, matches `Order.orderId`. */
  orderId: string;
  /** `OwnWallet` | `Main` — which wallet paid this leg. */
  source: string;
  /** Wei pulled by THIS leg, raw collateral units — not the order's total requirement. */
  amount: string;
  /** The main whose wallet was debited (`Main` only; null for `OwnWallet`), lowercased. */
  payer: string | null;
  /** Timestamp (unix seconds) of the pull. */
  timestamp: string;
  /** Block the pull landed in. */
  blockNumber: string;
  /** Tx hash the pull landed in. */
  txHash: string;
};

/**
 *  One movement of a main's claim against a child (mirror of the indexer
 *  `PerpMainFundingEvent` entity). **Bank side**, and the running principal.
 *
 *  - `Funded` — a main's wallet was debited for the child. `amount` moved; `payer` is the
 *    main; `outstandingPrincipal` is the claim after.
 *  - `Settled` — the child's own losses discharged part of the claim at a flat moment.
 *    **NO money moved**, so `amount` is null and `previousPrincipal` → `outstandingPrincipal`
 *    is the whole content. `payer` is null: a settle has no counterparty.
 *  - `Returned` — principal went home, by either signed route (`repayFunding` by the child
 *    or `recallFromChild` by the payer). Both settle against the SNAPSHOTTED payer, which
 *    is why `payer` here can differ from the child's current main.
 *
 *  **Gotchas.**
 *
 *  - **`amount` is null on `Settled`, and that is not missing data** — it is the point.
 *    Treating null as zero is right for a cash total and wrong for a claim total; the
 *    claim still fell, which `outstandingPrincipal` records.
 *  - Do not add these to {@link PerpMarginPull} rows. Same wei, two sides. See the module
 *    header.
 *  - The live claim is {@link SomniaMarketsClient.getPerpMainFunding | client.getPerpMainFunding} —
 *    a bank read. This is how it got
 *    there, not what it is now.
 *
 * @category perpetual markets
 */
export type PerpMainFundingEvent = {
  /** Row id (`${txHash}_${logIndex}`). */
  id: string;
  /** The child account the claim is against (lowercased). */
  account: string;
  /** `Funded` | `Settled` | `Returned`. */
  kind: string;
  /** The main on the other side (lowercased). Null on `Settled`, which has no counterparty. */
  payer: string | null;
  /** Wei that actually moved, raw collateral units. **Null on `Settled`** — see the type note. */
  amount: string | null;
  /** The claim BEFORE this event (`Settled` only). */
  previousPrincipal: string | null;
  /** The claim after this event. */
  outstandingPrincipal: string | null;
  /** Timestamp (unix seconds) of the movement. */
  timestamp: string;
  /** Block the movement landed in. */
  blockNumber: string;
  /** Tx hash the movement landed in. */
  txHash: string;
};

// prettier-ignore
const PerpWalletLinkEventsQuery = graphql(`
  query PerpWalletLinkEvents($where: PerpWalletLinkEvent_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         PerpWalletLinkEvent(where: $where, order_by: [{blockNumber: desc}, {logIndex: desc}], limit: $limit, offset: $offset) {
           id kind main child timestamp blockNumber logIndex txHash
         }
       }
`);

// prettier-ignore
const PerpMarginPullsQuery = graphql(`
  query PerpMarginPulls($where: PerpMarginPull_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         PerpMarginPull(where: $where, order_by: [{blockNumber: desc}, {id: desc}], limit: $limit, offset: $offset) {
           id account pool orderId source amount payer timestamp blockNumber txHash
         }
       }
`);

// prettier-ignore
const PerpMainFundingEventsQuery = graphql(`
  query PerpMainFundingEvents($where: PerpMainFundingEvent_bool_exp!, $limit: Int, $offset: Int) {
    _sdkWatermark: chain_metadata { chain_id latest_processed_block }
         PerpMainFundingEvent(where: $where, order_by: [{blockNumber: desc}, {id: desc}], limit: $limit, offset: $offset) {
           id account kind payer amount previousPrincipal outstandingPrincipal
           timestamp blockNumber txHash
         }
       }
`);

/**
 *  The linked-wallet consent graph over time, newest first.
 *
 *  Indexer tier. Filter by `main`, by `child`, or by `kind`; a wallet that is both a main
 *  and a child appears under each with the matching filter. Omit them all for the whole
 *  graph.
 *
 *  **This is the only way to see a PENDING proposal.** The registry exposes no getter for
 *  one, so this log is the sole off-chain evidence that an offer exists at all.
 *
 *  **What it yields is a CANDIDATE list, not a set of accepts that will succeed.**
 *  `acceptLink` reads live storage and applies five guards; this log can only settle
 *  three of them, and every one is a CURRENT-STATE question rather than an
 *  ever-happened one:
 *
 *  1. **Supersession, per DIRECTED pair.** An offer stands only while the pair's NEWEST
 *     row is the `Proposed` itself — `ProposalCancelled`, `Linked` or `Unlinked` after it
 *     retires it. Mind the direction on the last: `unlink` deletes `key(main, child)`
 *     **and** `key(child, main)`, so an `Unlinked` naming this wallet as MAIN can retire
 *     an offer it holds as CHILD. Testing "has any non-`Proposed` row ever appeared"
 *     instead hides RE-proposals, because `unlink` returns a wallet to where it started
 *     and offers that were dead become live again.
 *  2. **The child must be free right now** (`AlreadyLinked`). Accepting one main leaves
 *     the losing mains' proposals in storage, dead only while that link stands.
 *  3. **The main must not itself be a child right now** (`CallerIsChild`).
 *
 *  Guards 2 and 3 are live state, so read them with {@link getPerpWalletLinkage}
 *  (`isChild` / `isMain`) rather than replaying them off a page of log rows that may be
 *  truncated. The remaining two — `CallerIsMain` and `MaxChildrenReached` — are not
 *  answerable from this log at all: `MaxChildrenUpdated` is deliberately not subscribed.
 *  Confirm a candidate on chain before presenting it as an accept that will work.
 *
 *  Ordered by `(blockNumber, logIndex)` descending, which is true chain order. Not
 *  `timestamp`: a propose and its accept can land in one block, and separate blocks can
 *  share a timestamp while `logIndex` restarts in each — so a `(timestamp, logIndex)`
 *  sort interleaves rows from different blocks. `indexer/schema.graphql` states this
 *  requirement on the entity, and it is why `logIndex` is a column and not just part of
 *  the id.
 *
 * @example A child's inbox — candidate offers, correctly superseded
 * ```ts
 * // Both directions: an `unlink` naming me as MAIN also retires the offer the same
 * // pair holds the other way round.
 * const [inbound, outbound] = await Promise.all([
 *   client.listPerpWalletLinkEvents({ child: me, limit: 200 }),
 *   client.listPerpWalletLinkEvents({ main: me, limit: 200 }),
 * ]);
 * const rows = [...inbound, ...outbound];
 * // Chain order is the PAIR (blockNumber, logIndex) — compared as a pair, because
 * // logIndex restarts in every block and so cannot be packed against an unbounded one.
 * const isAfter = (a: PerpWalletLinkEvent, b: PerpWalletLinkEvent) =>
 *   BigInt(a.blockNumber) === BigInt(b.blockNumber)
 *     ? a.logIndex > b.logIndex
 *     : BigInt(a.blockNumber) > BigInt(b.blockNumber);
 * const onPair = (r: PerpWalletLinkEvent, main: string) =>
 *   (r.main === main && r.child === me) || (r.main === me && r.child === main);
 *
 * // Guard 1 only. Still candidates until guards 2 and 3 are read from the chain.
 * const candidates = inbound
 *   .filter((p) => p.kind === "Proposed")
 *   .filter((p) => !rows.some((r) => onPair(r, p.main) && isAfter(r, p)));
 * ```
 */
export async function listPerpWalletLinkEvents(
  opts: { main?: string; child?: string; kind?: string; limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<PerpWalletLinkEvent[]> {
  const where: Record<string, unknown> = {};
  if (opts.main != null) where.main = { _eq: opts.main.toLowerCase() };
  if (opts.child != null) where.child = { _eq: opts.child.toLowerCase() };
  if (opts.kind != null) where.kind = { _eq: opts.kind };
  const data = await IndexerRead.gqlRequest(
    PerpWalletLinkEventsQuery,
    { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.PerpWalletLinkEvent;
}

/**
 *  Margin pulled to fund placements, newest first — the POOL side of the rail.
 *
 *  Indexer tier. Filter by `account`, `pool`, `orderId` or `source`. Filtering by
 *  `source: "Main"` is how to see only what a linked main actually paid for, as opposed to
 *  what the owner's own wallet covered.
 *
 *  **Do not sum these with {@link listPerpMainFundingEvents}** — a `Main` leg emits a row
 *  on each side for the same wei. An `OwnWallet` leg appears only here, so this list is
 *  the wider of the two. Read this side when the question involves an ORDER, since it is
 *  the side that names one.
 *
 *  Ordered by `blockNumber` descending, with `id` as a tiebreaker. The tiebreaker makes
 *  `offset` pagination STABLE — no row repeats or disappears between pages — but it is
 *  not intra-block chain order: this entity carries no `logIndex` column, and its `id` is
 *  `txHash_logIndex`, so rows inside one block come back in a deterministic but arbitrary
 *  sequence. Ordering by `timestamp` would be worse still, since separate blocks can
 *  share one. Read `blockNumber` when the relative order of two rows in the same block
 *  matters; a `logIndex` column here needs a schema change and therefore a reindex.
 *
 * @example What a main paid for one order
 * ```ts
 * const legs = await client.listPerpMarginPulls({ orderId, source: "Main" });
 * const fromMain = legs.reduce((t, l) => t + BigInt(l.amount), 0n);
 * ```
 */
export async function listPerpMarginPulls(
  opts: { account?: string; pool?: string; orderId?: string; source?: string; limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<PerpMarginPull[]> {
  const where: Record<string, unknown> = {};
  if (opts.account != null) where.account = { _eq: opts.account.toLowerCase() };
  if (opts.pool != null) where.pool = { _eq: opts.pool.toLowerCase() };
  // An order id is a decimal string, not an address — lowercasing it would be harmless but
  // meaningless, and hiding that it is not an address is worse than leaving it exact.
  if (opts.orderId != null) where.orderId = { _eq: opts.orderId };
  if (opts.source != null) where.source = { _eq: opts.source };
  const data = await IndexerRead.gqlRequest(
    PerpMarginPullsQuery,
    { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.PerpMarginPull;
}

/**
 *  A main's claim against a child over time, newest first — the BANK side of the rail,
 *  carrying the running principal.
 *
 *  Indexer tier. Filter by `account` (the child the claim is against), by `payer` (the
 *  main), or by `kind`. The live claim is
 *  {@link SomniaMarketsClient.getPerpMainFunding | client.getPerpMainFunding}; this is the
 *  ledger behind it.
 *
 *  **Do not sum these with {@link listPerpMarginPulls}** — a `Funded` row here is the same
 *  wei as that list's `Main` leg. Read this side when the question is about the CLAIM,
 *  since it is the side that carries it.
 *
 *  Ordered by `blockNumber` descending, with `id` as a tiebreaker. The tiebreaker makes
 *  `offset` pagination STABLE — no row repeats or disappears between pages — but it is
 *  not intra-block chain order: this entity carries no `logIndex` column, and its `id` is
 *  `txHash_logIndex`, so rows inside one block come back in a deterministic but arbitrary
 *  sequence. Ordering by `timestamp` would be worse still, since separate blocks can
 *  share one. Read `blockNumber` when the relative order of two rows in the same block
 *  matters; a `logIndex` column here needs a schema change and therefore a reindex.
 *
 * @example How a child's claim moved, and by which route
 * ```ts
 * const ledger = await client.listPerpMainFundingEvents({ account: child });
 * // `Settled` rows moved no cash — amount is null — but still reduced the claim.
 * const timeline = ledger.map((r) => ({ kind: r.kind, claim: r.outstandingPrincipal }));
 * ```
 */
export async function listPerpMainFundingEvents(
  opts: { account?: string; payer?: string; kind?: string; limit?: number; offset?: number } = {},
  indexerUrl: IndexerRead.Source,
): Promise<PerpMainFundingEvent[]> {
  const where: Record<string, unknown> = {};
  if (opts.account != null) where.account = { _eq: opts.account.toLowerCase() };
  if (opts.payer != null) where.payer = { _eq: opts.payer.toLowerCase() };
  if (opts.kind != null) where.kind = { _eq: opts.kind };
  const data = await IndexerRead.gqlRequest(
    PerpMainFundingEventsQuery,
    { where, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
    indexerUrl,
  );
  return data.PerpMainFundingEvent;
}

// ---------------------------------------------------------------------------
// Writes. The rail's two layers each take signed calls, and WHICH WALLET SIGNS
// is the thing to get right — it is not the same wallet for any two adjacent
// steps, and no step can be sent on another wallet's behalf.
//
//   registry  proposeLink          the MAIN signs
//             acceptLink           the CHILD signs
//             cancelLinkProposal   the MAIN signs
//             unlink               EITHER side signs
//   bank      repayFunding         the CHILD signs
//             recallFromChild      the PAYER signs
//
// There is deliberately no verb here for the funding pull itself. The pull is not
// a call any wallet makes: `PerpPool._reserveAndPullMargin` performs it inside the
// child's own order placement, gated on `msg.sender == order.owner`. So a main
// funds a child by holding USDso and an allowance to the bank and then doing
// nothing — `trader.placePerpOrder`, sent by the child, is the whole write side.
//
// Each verb shares its call construction with its build-only twin where one
// exists, so the calldata cannot drift between the two.
// ---------------------------------------------------------------------------

/**
 *  Resolves the registry a consent write targets, then builds the call.
 *
 *  Split out because all four consent writes differ only in function name and in
 *  which single address they carry — one resolution path, four verbs, so the four
 *  cannot end up resolving differently.
 */
async function consentCall(
  w: WriterCtx,
  p: PerpWalletLinkTarget,
  functionName: "proposeLink" | "acceptLink" | "cancelLinkProposal" | "unlink",
  counterparty: Address,
): Promise<Writer.WriteCall> {
  // `registry` wins outright; otherwise the bank names its own authoritative
  // registry, and `pool` reaches the bank first.
  //
  // THE ZERO CHECK IS NOT DEFENSIVE NOISE. `??` falls through on null and undefined
  // only, so an explicit `registry: ZERO_ADDRESS` would sail past the dormant-bank
  // guard and become the transaction target — and a call to an address with no code
  // SUCCEEDS with empty returndata. The receipt would report a linked wallet while no
  // state changed anywhere, which is the one failure a caller cannot detect afterwards.
  if (p.registry === Writer.ZERO_ADDRESS) {
    throw new InvalidInputError("registry must not be the zero address (a call to it would succeed and do nothing)");
  }
  const registry = p.registry ?? (await w.bankLinkedWalletRegistry(await w.resolveMarginBank(p), undefined));
  return {
    address: registry,
    abi: TradeAbi.linkedWalletRegistryWriteAbi,
    functionName,
    args: [counterparty],
    gas: p.gas ?? w.defaultGas,
  };
}

/**
 *  Offer a child wallet a link to the signer as its main.
 *
 *  The signer is the prospective MAIN. This is half of a two-sided handshake and
 *  moves no money: the child must send {@link acceptPerpWalletLink} before any
 *  order of its can draw on the signer's wallet.
 *
 *  **Details**
 *
 *  - `p`: {@link ProposePerpWalletLinkParams}.
 *  - Returns: the transaction result.
 *
 *  **Gotchas**
 *
 *  The proposal is the ONLY record of itself. The registry keeps pending proposals
 *  in a hashed map with no getter, so the child cannot discover this offer from a
 *  chain read — it has to read `client.listPerpWalletLinkEvents({ child })`. An
 *  offer nobody surfaces is an offer nobody can accept.
 *
 *  A link grants no authority over funds. Consent is this handshake PLUS the
 *  main's ERC-20 allowance to the bank; revoking the allowance stops the funding
 *  without touching the link.
 *
 *  The depth-1 shape is enforced here and again at accept time: a wallet is a main
 *  or a child, never both.
 *
 *  - Throws {@link InvalidInputError} - neither `registry`, `marginBank` nor `pool` was passed.
 *  - Throws {@link NotConfiguredError} - the bank holds no registry, so the rail is dormant on this deployment.
 *  - Throws {@link RpcError} - the registry or bank resolution read did not complete. A failed resolution never broadcasts.
 *  - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
 *  - Throws {@link ContractRevertError} - `CannotLinkSelf` (the signer named itself), `CallerIsChild` (the signer is already someone's child), `AlreadyLinked` (`child` already has a main), `NoStateChange` (this exact offer already stands), or `ZeroAddress`.
 *
 * @example Onboarding an isolated-margin sub-account
 * ```ts
 * // The MAIN offers. Its own deposit leaves the standing allowance the rail spends,
 * // so one funded main can serve every child it later links.
 * await main.trader.depositMargin({ marginBank, amount: 1_000_000_000_000_000_000_000n });
 * await main.trader.proposePerpWalletLink({ marginBank, child: childAddress });
 *
 * // The CHILD accepts. Its own signer, its own transaction — nobody can accept for it.
 * await child.trader.acceptPerpWalletLink({ marginBank, main: mainAddress });
 *
 * // From here the child's own placement pulls the shortfall from the main's wallet.
 * const payer = await child.client.quotePerpFundingPayer(marginBank, childAddress);
 * if (payer.funded) console.log("funded by", payer.payer);
 * ```
 *
 * @category perpetual markets
 */
export async function proposePerpWalletLink(w: WriterCtx, p: ProposePerpWalletLinkParams): Promise<TxResult> {
  return w.execute(await consentCall(w, p, "proposeLink", p.child));
}

/**
 *  Accept a main's standing offer, as the child.
 *
 *  The signer is the CHILD. From here its position-increasing orders draw their
 *  shortfall from `main`'s wallet, and the link starts its maturity clock.
 *
 *  **Details**
 *
 *  - `p`: {@link AcceptPerpWalletLinkParams}.
 *  - Returns: the transaction result.
 *
 *  **Gotchas**
 *
 *  Five live-state guards run here, and a proposal in the log satisfies none of
 *  them by itself — read `client.getPerpWalletLinkage` before offering an accept in
 *  a UI. Two of the five (`CallerIsMain`, `MaxChildrenReached`) are not answerable
 *  off the log at all.
 *
 *  Funding does NOT wait for maturity. The rail reads the raw graph, so a pull can
 *  happen in the next block. `maturesAt` gates ADL netting only.
 *
 *  Accepting one main leaves every other main's proposal in storage. Those stay
 *  dead only while this link stands, and become live again after an unlink.
 *
 *  - Throws {@link InvalidInputError} - neither `registry`, `marginBank` nor `pool` was passed.
 *  - Throws {@link NotConfiguredError} - the bank holds no registry, so the rail is dormant on this deployment.
 *  - Throws {@link RpcError} - the registry or bank resolution read did not complete. A failed resolution never broadcasts.
 *  - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
 *  - Throws {@link ContractRevertError} - `NoProposalPending` (no offer from `main` stands), `CallerIsChild` (`main` has itself become a child), `CallerIsMain` (the signer already has children), `AlreadyLinked` (the signer already has a main), or `MaxChildrenReached`.
 *
 * @category perpetual markets
 */
export async function acceptPerpWalletLink(w: WriterCtx, p: AcceptPerpWalletLinkParams): Promise<TxResult> {
  return w.execute(await consentCall(w, p, "acceptLink", p.main));
}

/**
 *  Withdraw an offer the signer made and the child has not accepted.
 *
 *  The signer is the MAIN. Use it to clear a child's inbox; an ACCEPTED link comes
 *  down with {@link unlinkPerpWallet} instead.
 *
 *  **Details**
 *
 *  - `p`: {@link CancelPerpWalletLinkProposalParams}.
 *  - Returns: the transaction result.
 *
 *  **Gotchas**
 *
 *  Cancelling is what keeps a child's inbox honest. `listPerpWalletLinkEvents`
 *  supersedes an offer by the pair's newest row, so without this the child keeps
 *  being shown an offer the main no longer intends to honour.
 *
 *  - Throws {@link InvalidInputError} - neither `registry`, `marginBank` nor `pool` was passed.
 *  - Throws {@link NotConfiguredError} - the bank holds no registry, so the rail is dormant on this deployment.
 *  - Throws {@link RpcError} - the registry or bank resolution read did not complete. A failed resolution never broadcasts.
 *  - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
 *  - Throws {@link ContractRevertError} - `NoProposalPending` (nothing pending for this pair, including an offer already accepted).
 *
 * @category perpetual markets
 */
export async function cancelPerpWalletLinkProposal(
  w: WriterCtx,
  p: CancelPerpWalletLinkProposalParams,
): Promise<TxResult> {
  return w.execute(await consentCall(w, p, "cancelLinkProposal", p.child));
}

/**
 *  Dissolve an accepted link, from either end.
 *
 *  Pass the OTHER party. The registry resolves which side is the main, so a main
 *  and a child call this the same way.
 *
 *  **Details**
 *
 *  - `p`: {@link UnlinkPerpWalletParams}.
 *  - Returns: the transaction result.
 *
 *  **Gotchas**
 *
 *  Unlinking does NOT settle money. A claim the main funded survives it and still
 *  gates the child's withdrawals, and both routes home settle against the payer
 *  snapshotted at funding time — so an unlink cannot strand or misroute it. Clear
 *  the claim with {@link repayPerpMainFunding} or {@link recallPerpMainFunding}
 *  first if the intent is to part cleanly.
 *
 *  `PerpsUnlinkGuard` vetoes the unlink while the LEAVER holds open positions and
 *  is at `PartialLiquidation` or worse. A healthy wallet can always leave, even
 *  when its counterparty is unhealthy, and a flat wallet can always leave. The
 *  registry calls the guard through try/catch and fails open, so a stale oracle
 *  inside the guard cannot trap an unlink.
 *
 *  Both directions of the pair's pending proposal are cleared, so a later re-link
 *  needs a fresh {@link proposePerpWalletLink}. Re-linking also restarts the
 *  maturity clock.
 *
 *  - Throws {@link InvalidInputError} - neither `registry`, `marginBank` nor `pool` was passed.
 *  - Throws {@link NotConfiguredError} - the bank holds no registry, so the rail is dormant on this deployment.
 *  - Throws {@link RpcError} - the registry or bank resolution read did not complete. A failed resolution never broadcasts.
 *  - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
 *  - Throws {@link ContractRevertError} - `NotLinked` (the two are not a linked pair) or `UnlinkBlockedByGuard` (the leaver is liquidatable with open positions).
 *
 * @category perpetual markets
 */
export async function unlinkPerpWallet(w: WriterCtx, p: UnlinkPerpWalletParams): Promise<TxResult> {
  return w.execute(await consentCall(w, p, "unlink", p.counterparty));
}

/** The bank call {@link repayPerpMainFunding} sends. Shared with its build-only twin. */
function repayCall(w: WriterCtx, bank: Address, p: RepayPerpMainFundingParams): Writer.WriteCall {
  return {
    address: bank,
    abi: TradeAbi.marginBankWriteAbi,
    functionName: "repayFunding",
    args: [p.amount],
    gas: p.gas ?? w.defaultGas,
  };
}

/**
 *  Return principal the signer's main funded, as the child.
 *
 *  Signed by the CHILD. The money goes to the payer the bank recorded at funding
 *  time, which is not necessarily whoever is linked now.
 *
 *  **Details**
 *
 *  - `p`: {@link RepayPerpMainFundingParams}.
 *  - Returns: the transaction result.
 *
 *  **Gotchas**
 *
 *  The amount is CLAMPED, not validated: the bank returns
 *  `min(amount, outstanding, present balance)`. So over-asking is safe and repays
 *  what is there, and only a clamp that reaches zero reverts. Read the outstanding
 *  principal with `client.getPerpMainFunding` and pass it to repay in full.
 *
 *  Repaying is what unlocks the child's own money. `withdraw` frees at most
 *  `balance - outstanding`, so a child with a standing claim reads a positive
 *  balance and a zero withdrawable until this lands.
 *
 *  Funding settles first, and initial margin is re-checked afterwards when the
 *  child holds positions — so a repayment that would leave the account below IM
 *  reverts rather than opening a liquidation.
 *
 *  A child that genuinely LOST the principal owes nothing: the bank ratchets the
 *  claim down to the surviving balance at flat moments. The child's own money is
 *  the junior tranche and a loss eats it first.
 *
 *  - Throws {@link InvalidInputError} - `amount` is not positive, or neither `marginBank` nor `pool` was passed.
 *  - Throws {@link RpcError} - the bank resolution read did not complete. A failed resolution never broadcasts.
 *  - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
 *  - Throws {@link ContractRevertError} - `NoFundedPrincipal` (nothing outstanding), `NothingToReturn` (the clamp reached zero, so the balance is gone), or `InsufficientMarginAfterWithdrawal` (the repayment would leave open positions below IM).
 *
 * @example Repaying in full, then taking the rest out
 * ```ts
 * const claim = await child.client.getPerpMainFunding(marginBank, childAddress);
 * if (claim.principal > 0n) {
 *   // Over-asking is clamped, so the outstanding figure cannot be stale-high here.
 *   await child.trader.repayPerpMainFunding({ marginBank, amount: claim.principal });
 * }
 * const { withdrawable } = await child.client.getMarginAccount(marginBank, childAddress);
 * if (withdrawable > 0n) await child.trader.withdrawMargin({ marginBank, amount: withdrawable });
 * ```
 *
 * @category perpetual markets
 */
export async function repayPerpMainFunding(w: WriterCtx, p: RepayPerpMainFundingParams): Promise<TxResult> {
  requirePositiveAmount(p.amount);
  return w.execute(repayCall(w, await w.resolveMarginBank(p), p));
}

/**
 *  Pull principal back out of a child, as the payer.
 *
 *  Signed by the PAYER. Same clamped accounting as
 *  {@link repayPerpMainFunding} and the same destination — the bank pays the
 *  recorded payer, and rejects any other signer.
 *
 *  **Details**
 *
 *  - `p`: {@link RecallPerpMainFundingParams}.
 *  - Returns: the transaction result.
 *
 *  **Gotchas**
 *
 *  This recovers principal, never winnings. The claim is capped at what the main
 *  actually funded and is ratcheted down by the child's losses, so a recall on a
 *  profitable child takes back the principal and leaves the profit with the child.
 *
 *  It does not need an unlink and does not perform one. The link stays, so the
 *  child can be funded again by the same main without a fresh handshake.
 *
 *  There is no recall-everything sweep. Read each child from
 *  `client.listPerpLinkedChildren` and recall per child; a main with several
 *  children has several separate claims.
 *
 *  - Throws {@link InvalidInputError} - `amount` is not positive, or neither `marginBank` nor `pool` was passed.
 *  - Throws {@link RpcError} - the bank resolution read did not complete. A failed resolution never broadcasts.
 *  - Throws {@link TransactionOutcomeUnknownError} - the transaction may have reached the node and its receipt was not observed. Look up `hash` before sending again.
 *  - Throws {@link ContractRevertError} - `OnlyFundingPayer` (the signer is not the recorded payer), `NoFundedPrincipal` (nothing outstanding), `NothingToReturn` (the clamp reached zero), or `InsufficientMarginAfterWithdrawal` (the recall would leave the child's open positions below IM).
 *
 * @category perpetual markets
 */
export async function recallPerpMainFunding(w: WriterCtx, p: RecallPerpMainFundingParams): Promise<TxResult> {
  requirePositiveAmount(p.amount);
  const bank = await w.resolveMarginBank(p);
  return w.execute({
    address: bank,
    abi: TradeAbi.marginBankWriteAbi,
    functionName: "recallFromChild",
    args: [p.child, p.amount],
    gas: p.gas ?? w.defaultGas,
  });
}

/**
 *  The one input check both repayment routes share.
 *
 *  Hoisted so it fires before the bank is resolved: bad input should not cost a
 *  chain read, and should not surface as `resolveMarginBank`'s "pass marginBank or
 *  pool" instead. The bank rejects zero as `InvalidAmount`; this names the fix.
 */
function requirePositiveAmount(amount: bigint): void {
  if (amount <= 0n) throw new InvalidInputError("amount must be > 0");
}

// ---------------------------------------------------------------------------
// Build-only twins, for the two steps that have an ORDERING DEPENDENCY inside one
// transaction. Sent as separate transactions each of these leaves a real gap:
//
//   acceptLink -> placeOrder   the child is linked but unfunded in between, so the
//                              onboarding flow that opens the isolated position
//                              needs one signature, not two.
//   repayFunding -> withdraw   `withdraw` frees at most `balance - claim`, so the
//                              withdrawal has to follow the repayment to see the
//                              money at all.
//
// The other four verbs are standalone administrative calls with no such
// companion, so they have no twin. Add one when a batched flow actually needs it.
// ---------------------------------------------------------------------------

/**
 *  Build {@link acceptPerpWalletLink} without sending it.
 *
 *  Takes the same inputs and hands back the unsigned call, so the accept and the
 *  child's first isolated placement can go out as ONE transaction. Resolving the
 *  registry still costs a chain read unless you pass `registry`.
 *
 *  **Details**
 *
 *  - `p`: The same inputs as {@link acceptPerpWalletLink}.
 *  - Returns: the unsigned `acceptLink` call.
 *
 *  **Gotchas**
 *
 *  Order matters. The accept must execute before the placement, or the placement
 *  finds no main and pulls only the child's own wallet.
 *
 *  - Throws {@link InvalidInputError} - neither `registry`, `marginBank` nor `pool` was passed.
 *  - Throws {@link NotConfiguredError} - the bank holds no registry, so the rail is dormant on this deployment.
 *  - Throws {@link RpcError} - the registry or bank resolution read did not complete.
 *
 * @category perpetual markets
 */
export async function buildAcceptPerpWalletLink(
  w: WriterCtx,
  p: AcceptPerpWalletLinkParams,
): Promise<Writer.UnsignedCall> {
  const call = await consentCall(w, p, "acceptLink", p.main);
  return Writer.toUnsigned(w.chain.id, call, `Accept a linked-wallet offer from main ${p.main}`);
}

/**
 *  Build {@link repayPerpMainFunding} without sending it.
 *
 *  Takes the same inputs and hands back the unsigned call, so the repayment and
 *  the withdrawal it unlocks can go out as ONE transaction. Resolving the bank
 *  still costs a chain read unless you pass `marginBank`.
 *
 *  **Details**
 *
 *  - `p`: The same inputs as {@link repayPerpMainFunding}.
 *  - Returns: the unsigned `repayFunding` call.
 *
 *  **Gotchas**
 *
 *  Order matters. The repayment must execute before the withdrawal, because the
 *  withdrawal's own gate reads the claim this call clears.
 *
 *  - Throws {@link InvalidInputError} - `amount` is not positive, or neither `marginBank` nor `pool` was passed.
 *  - Throws {@link RpcError} - the bank resolution read did not complete.
 *
 * @category perpetual markets
 */
export async function buildRepayPerpMainFunding(
  w: WriterCtx,
  p: RepayPerpMainFundingParams,
): Promise<Writer.UnsignedCall> {
  requirePositiveAmount(p.amount);
  const bank = await w.resolveMarginBank(p);
  return Writer.toUnsigned(
    w.chain.id,
    repayCall(w, bank, p),
    `Repay ${p.amount} of main-funded principal to MarginBank ${bank}`,
  );
}
