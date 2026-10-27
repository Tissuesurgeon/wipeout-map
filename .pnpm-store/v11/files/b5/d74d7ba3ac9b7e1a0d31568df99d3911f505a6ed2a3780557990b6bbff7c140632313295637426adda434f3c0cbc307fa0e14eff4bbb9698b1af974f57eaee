import type { Address, PublicClient } from "viem";
import type { PerpMarket } from "../markets.js";
/**
 *  Whether a failed read means "this contract does not have that function" rather than
 *  "the request did not get through". Lives at the revert boundary ({@link Revert.isMissingContractView});
 *  re-exported here for the perp callers that grew up with it.
 */
export declare function isMissingContractView(err: unknown): boolean;
/**
 *  ERC-165 id of `IPerpPoolFactoryMarketStatus` — the feature-detection handle that
 *  tells an upgraded factory from one predating the market-status views.
 *
 *  A separate interface from `IPerpPoolFactory` on purpose: two live rotation gates
 *  (`MarginBank.setPerpPoolFactory`, `OperatorPermissionsRegistry.setPerpPoolFactory`)
 *  check `type(IPerpPoolFactory).interfaceId`, so declaring these views there would
 *  have changed the advertised id and turned a one-contract upgrade into a
 *  coordinated three-contract one.
 *
 * @category perpetual markets
 */
export declare const PERP_POOL_FACTORY_MARKET_STATUS_INTERFACE_ID: "0xa874fb70";
/**
 *  One factory-deployed perp market and whether it can actually be traded.
 *
 *  **`restricted` and `registered` are independent gates that fail for unrelated
 *  reasons.** A market can be perfectly registered with the bank and still be
 *  close-only, or unrestricted and never activated. Both have to pass, which is what
 *  {@link tradeable} folds together.
 *
 * @category perpetual markets
 */
export type PerpPoolStatus = {
    /** The PerpPool beacon proxy. */
    pool: Address;
    /** The synthetic base ERC-20 the market tracks. */
    baseToken: Address;
    /**
     *  The MarginBank this pool settles against, read from the pool itself.
     *
     *  Effectively a per-network singleton, but taken per-pool because the pool is
     *  what the settlement path actually uses — so this is the bank a later
     *  `getMarginAccount` / `getPerpPosition` / `getLiquidationPrice` for this market
     *  must be addressed to. Carrying it here means a consumer never has to source it
     *  separately, and never has to hardcode it per chain.
     */
    marginBank: Address;
    /**
     *  True when the market is CLOSE-ONLY: position-increasing orders revert
     *  `MarketRestricted`, while closes, reduces and cancels still work.
     *
     *  Restricted markets stay visible on purpose — holders still have to close
     *  positions, cancel orders and withdraw collateral, and liquidation runs on them
     *  unchanged. Reversible: a restriction can be a temporary wind-down rather than a
     *  retirement.
     */
    restricted: boolean;
    /**
     *  Whether {@link marginBank} has this pool registered — the ACTIVATION gate.
     *
     *  Coming from the factory only proves a pool is authentic; `addPerpPool` is the
     *  separate step that makes it usable, and `removePerpPool` revokes it. An
     *  unregistered pool rejects every settlement callback and every quote view while
     *  still reading as an ordinary market from the factory.
     *
     *  `null` when the gate is genuinely unreadable, from either of two causes: the pool's
     *  MarginBank predates `isPerpPoolRegistered`, or that pool's bank reads failed while
     *  other pools' succeeded. Nothing substitutes for it — `getPoolTier` is itself gated
     *  on registration (so it collapses to 0 for both an uncovered-but-registered market
     *  and an unregistered one) and `getActivePerpPools` is per-account, not the registry.
     *
     *  On the read-failure cause, {@link marginBank} is the zero address: the pool's own
     *  bank could not be established either, so do not address a settlement read to it.
     */
    registered: boolean | null;
    /**
     *  Both gates passed — not restricted AND registered. The list to show as tradeable.
     *
     *  `null` when {@link registered} is unknown: with one of the two gates unreadable,
     *  tradeability is genuinely undetermined, and reporting `false` would hide live
     *  markets while `true` would advertise dead ones.
     */
    tradeable: boolean | null;
};
/**
 *  Every perp market the factory has deployed, in deployment order (oldest first),
 *  with the two gates that decide whether it is tradeable.
 *
 *  Chain tier. **Do not build a market list from `getPerpPools()` alone** — that is
 *  the raw deployment history and includes markets wound down to close-only, so
 *  listing it unfiltered presents dead markets as tradeable.
 *
 *  Prefers the factory's `getPerpPoolStatuses()`, which returns every market's base
 *  token and restriction state in ONE call. That is not merely cheaper than pairing
 *  `getUnrestrictedPerpPools` with `getRestrictedPerpPools`: two calls can straddle a
 *  `setRestricted` and yield a set that never existed at any block.
 *
 *  Falls back, on a factory predating those views (ERC-165 says so, or has no ERC-165
 *  at all), to `getPerpPools()` plus per-pool base-token and restriction reads: the
 *  same rows, so a consumer never branches on which chain it is talking to.
 *
 *  One field does differ there, and it cannot be helped. `isPerpPoolRegistered` shipped
 *  in the SAME upgrade wave as the factory's status views, so a chain taking this
 *  fallback is precisely a chain whose bank cannot answer the registration gate —
 *  {@link PerpPoolStatus.registered} and {@link PerpPoolStatus.tradeable} come back
 *  `null` rather than guessed. Everything else is identical.
 *
 *  With an owner-configured candidate MarginBank and usable Multicall3, the modern
 *  path reads the block and factory views atomically, then reads pool banks and
 *  candidate registrations together. Up to 50 pools fit in the second request;
 *  larger sets use concurrent chunks of at most 100 calls. A candidate result is
 *  used only when the pool names that bank at the captured block. Divergent banks
 *  require an additional authoritative registration round.
 *
 *  Without a candidate or usable Multicall3, discovery retains the bounded path:
 *  at most 100 calls per aggregate or 8 concurrent point reads. All reads describe
 *  one block. The pool's own bank remains the authority on every path.
 *
 * **Details**
 *
 * - `p.factory`: the PerpPoolFactory
 */
export declare function listPerpPoolStatuses(p: {
    factory: Address;
}, client: PublicClient, candidateMarginBank?: Address): Promise<PerpPoolStatus[]>;
/**
 *  Most contract reads one discovery request carries: the declared batch capacity.
 *
 *  Each independent per-pool stage of {@link listPerpPoolStatuses} sends one Multicall3
 *  aggregate per this many pools. Its request count is `ceil(pools / capacity)`, not
 *  one request per pool. The combined candidate stage uses two calls per pool, so
 *  each aggregate holds at most 50 pools. No aggregate exceeds 100 member calls.
 *
 *  Aliases the shared read boundary's {@link Reads.READ_BATCH_CAPACITY}.
 */
export declare const PERP_DISCOVERY_BATCH_CAPACITY = 100;
/**
 *  Most point reads in flight at once when the chain has no usable Multicall3. The
 *  fallback sends one request per read, and this bound stops a large factory from
 *  opening hundreds of concurrent requests.
 *
 *  The discovery-facing name for {@link Reads.READ_FALLBACK_CONCURRENCY}.
 */
export declare const PERP_DISCOVERY_FALLBACK_CONCURRENCY = 8;
/**
 *  Just the tradeable markets — the common case, filtered from
 *  {@link listPerpPoolStatuses}. Chain tier.
 *
 * **Gotchas**
 *
 * - Throws if any market's registration gate is unreadable (a MarginBank predating `isPerpPoolRegistered`). Silently dropping those rows would return a SHORT list that looks authoritative — the one failure a caller could not detect — so this refuses rather than guesses. Use {@link listPerpPoolStatuses} to see the markets and decide for yourself.
 */
export declare function listTradeablePerpPools(p: {
    factory: Address;
}, client: PublicClient, candidateMarginBank?: Address): Promise<Address[]>;
/**
 *  Whether the MarginBank has a perp pool registered — the activation gate on its
 *  own.
 *
 *  Chain tier. Use when checking one known pool; {@link listPerpPoolStatuses}
 *  answers it for every market alongside the restriction gate.
 *
 *  Do not reach for `getPoolTier` instead: it is itself gated on registration, so it
 *  returns 0 for an uncovered-but-registered market and an unregistered one alike.
 */
export declare function isPerpPoolRegistered(p: {
    marginBank: Address;
    pool: Address;
}, client: PublicClient): Promise<boolean>;
/**
 *  One factory-deployed perp market as a {@link PerpMarket} row, read entirely
 *  from the chain — for a market the indexer does not know.
 *
 *  Chain tier. `PerpPoolDeployed` names the pool, its base token and its bank,
 *  and nothing else the row needs, so the grid, the margin factor and the base
 *  token's ERC-20 metadata are read from the pool and the token here.
 *
 *  **Gotchas**
 *
 *  - The five HISTORY fields cannot come from the chain and are placeholders, not measurements: `cumulativeBaseVolume`, `cumulativeQuoteVolume` and `tradeCount` are `"0"`, and `createdAtTimestamp` / `createdAtBlock` are `"0"`. Zero here means UNKNOWN, not "never traded". Branch on {@link UnifiedMarket.indexed} before reading them; a market this function produced has it false.
 *  - Every funding, mark-price and open-interest field is null for the same reason — the indexer derives them from events. Read {@link SomniaMarketsClient.getPerpState} for the live values.
 *  - `stopRegistry` comes from the factory's `getStopOrderRegistry` — the only on-chain route to it, because the registry is separately deployed and the pool holds no pointer back. Null both when the factory records none for this pool (TP/SL genuinely unavailable) and when the factory predates that read (undiscoverable). The two are not distinguished, because the consequence is identical: TP/SL cannot be offered.
 */
export declare function readPerpMarketFromChain(p: {
    /** The pool's chain-tier status, from {@link listPerpPoolStatuses}. */
    status: PerpPoolStatus;
    /** The collateral token every perp market is quoted in (`MarginBank.getSystemConfig`). */
    collateralToken: Address;
    /** The collateral's ERC-20 decimals. */
    collateralDecimals: number;
    /** The collateral's ERC-20 symbol, or null when it exposes none. */
    collateralSymbol: string | null;
    /** The PerpPoolFactory — the only contract that knows this pool's stop registry. */
    factory: Address;
}, client: PublicClient): Promise<PerpMarket>;
