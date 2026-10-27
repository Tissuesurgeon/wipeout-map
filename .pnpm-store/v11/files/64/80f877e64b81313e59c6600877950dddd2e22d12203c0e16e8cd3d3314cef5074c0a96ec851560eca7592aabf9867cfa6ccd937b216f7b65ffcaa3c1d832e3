// Perp market DISCOVERY — which markets exist, and which of them are tradeable.
//
// PERP-ONLY. Spot and binary markets are discovered through the indexer; perps have
// an on-chain factory that is the actual source of truth for what has been deployed,
// which matters twice over. It survives an indexer that is behind or mid-reindex,
// and it is complete: the indexer builds its perp set dynamically from
// `PerpPoolDeployed`, so a pool deployed above its current head is invisible there
// and present here.
//
// The hard part is not enumeration, it is that "deployed" is not "tradeable". Two
// independent gates decide that, and they fail for unrelated reasons.
import { ChainDoesNotSupportContract, isAddress, zeroAddress } from "viem";
import { RpcError } from "../errors.js";
import * as Markets from "../markets.js";
import * as Raise from "../raise.js";
import * as Reads from "../readEach.js";
import * as ReadsAbi from "../readsAbi.js";
import * as Revert from "../revert.js";
/**
 *  Whether a failed read means "this contract does not have that function" rather than
 *  "the request did not get through". Lives at the revert boundary ({@link Revert.isMissingContractView});
 *  re-exported here for the perp callers that grew up with it.
 */
export function isMissingContractView(err) {
    return Revert.isMissingContractView(err);
}
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
export const PERP_POOL_FACTORY_MARKET_STATUS_INTERFACE_ID = "0xa874fb70";
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
export async function listPerpPoolStatuses(p, client, candidateMarginBank) {
    const candidate = candidateMarginBank && candidateMarginBank !== zeroAddress ? candidateMarginBank : undefined;
    const snapshot = candidate ? await atomicStatuses(p.factory, client) : undefined;
    const useMulticall = snapshot !== null;
    // Every read below is pinned to ONE block. The atomicity argument for preferring
    // `getPerpPoolStatuses` over two calls applies just as much to the registration
    // fan-out that follows it: unpinned, a `setRestricted` and a `removePerpPool` landing
    // mid-walk would produce a row whose two gates came from different heights — a state
    // that never coexisted on chain.
    const blockNumber = snapshot?.blockNumber ?? (await client.getBlockNumber());
    const f = { address: p.factory, abi: ReadsAbi.perpPoolFactoryReadAbi, blockNumber };
    // A factory old enough to predate the status views may also predate ERC-165 itself,
    // in which case the probe reverts rather than answering false. Treating that as
    // "no status views" is the whole point of having a fallback — letting it throw would
    // strand the callers the fallback exists for.
    const hasStatusViews = snapshot?.hasStatusViews ??
        (await client
            .readContract({ ...f, functionName: "supportsInterface", args: [PERP_POOL_FACTORY_MARKET_STATUS_INTERFACE_ID] })
            .catch((err) => {
            if (isMissingContractView(err))
                return false;
            throw err;
        }));
    const base = hasStatusViews
        ? (snapshot?.statuses ?? (await client.readContract({ ...f, functionName: "getPerpPoolStatuses" }))).map((s) => ({
            pool: s.perpPool,
            baseToken: s.baseToken,
            restricted: s.restricted,
        }))
        : await legacyStatuses(p.factory, client, blockNumber, useMulticall);
    // PER-POOL, not all-or-nothing. One pool whose bank cannot be read must not reject
    // the whole listing: a consumer that loses every status loses the gates for every
    // OTHER market too, and an unrelated restricted market then reads as tradeable again.
    // A pool that cannot be resolved comes back with its registration UNDETERMINED
    // instead, which is what it genuinely is. Each request carries at most
    // `PERP_DISCOVERY_BATCH_CAPACITY` calls, and every member settles on its own.
    const combined = snapshot?.hasStatusViews && candidate ? await readCandidateGates(client, blockNumber, base, candidate) : undefined;
    const banks = combined?.banks ??
        (await Reads.readEach(client, blockNumber, ReadsAbi.perpPoolReadAbi, "marginBank", base.map((b) => ({ address: b.pool })), useMulticall));
    const resolved = base.flatMap((b, i) => {
        const bank = banks[i] ?? Raise.unreachable("batched read without its input");
        return bank.status === "success" ? [{ pool: b.pool, marginBank: bank.result, index: i }] : [];
    });
    // `isPerpPoolRegistered` shipped in the SAME wave as the factory's status views,
    // so a chain old enough to take the fallback above is exactly a chain whose bank
    // does not answer this — and there is no substitute: `getPoolTier` is itself
    // gated on registration, and `getActivePerpPools` is per-ACCOUNT, not the
    // registry. Unhandled, this read reverted and rejected the whole listing,
    // leaving the fallback dead on arrival on every environment it was written for.
    // Registration is reported as unknown there rather than guessed. Any OTHER failure
    // leaves the pool unresolved, exactly like a bank that could not be read.
    // A speculative registration is authoritative only after the pool names that bank.
    const fallback = resolved.filter((r) => !combined || r.marginBank.toLowerCase() !== candidate?.toLowerCase());
    const registrations = await Reads.readEach(client, blockNumber, ReadsAbi.marginBankReadAbi, "isPerpPoolRegistered", fallback.map((r) => ({ address: r.marginBank, args: [r.pool] })), useMulticall);
    const gates = new Map();
    const authoritative = new Map(fallback.map((r, i) => [r.pool, registrations[i]]));
    resolved.forEach((r) => {
        const read = (combined && r.marginBank.toLowerCase() === candidate?.toLowerCase()
            ? combined.registrations[r.index]
            : authoritative.get(r.pool)) ?? Raise.unreachable("batched read without its input");
        if (read.status === "success")
            gates.set(r.pool, { marginBank: r.marginBank, registered: read.result });
        else if (isMissingContractView(read.error))
            gates.set(r.pool, { marginBank: r.marginBank, registered: null });
    });
    return base.map((b) => {
        const gate = gates.get(b.pool);
        if (gate)
            return { ...b, ...gate, tradeable: gate.registered === null ? null : !b.restricted && gate.registered };
        // `restricted` and `baseToken` came from the factory's atomic call and are still
        // good; only the bank could not be reached. Reported as undetermined, never guessed —
        // and `restricted: true` still closes the market on its own.
        return { ...b, marginBank: zeroAddress, registered: null, tradeable: null };
    });
}
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
export const PERP_DISCOVERY_BATCH_CAPACITY = Reads.READ_BATCH_CAPACITY;
/**
 *  Most point reads in flight at once when the chain has no usable Multicall3. The
 *  fallback sends one request per read, and this bound stops a large factory from
 *  opening hundreds of concurrent requests.
 *
 *  The discovery-facing name for {@link Reads.READ_FALLBACK_CONCURRENCY}.
 */
export const PERP_DISCOVERY_FALLBACK_CONCURRENCY = Reads.READ_FALLBACK_CONCURRENCY;
// Multicall3 reports the block inside the same eth_call as the factory views.
const blockNumberAbi = [
    {
        type: "function",
        name: "getBlockNumber",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }],
    },
];
async function atomicStatuses(factory, client) {
    const multicall = client.chain?.contracts?.multicall3;
    if (!multicall || typeof client.multicall !== "function")
        return undefined;
    let reads;
    try {
        reads = await client.multicall({
            contracts: [
                { address: multicall.address, abi: blockNumberAbi, functionName: "getBlockNumber" },
                {
                    address: factory,
                    abi: ReadsAbi.perpPoolFactoryReadAbi,
                    functionName: "supportsInterface",
                    args: [PERP_POOL_FACTORY_MARKET_STATUS_INTERFACE_ID],
                },
                { address: factory, abi: ReadsAbi.perpPoolFactoryReadAbi, functionName: "getPerpPoolStatuses" },
            ],
            allowFailure: true,
            batchSize: 0,
        });
    }
    catch (error) {
        if (error instanceof ChainDoesNotSupportContract)
            return null;
        throw error;
    }
    // An absent Multicall contract returns zero data for every member. Only that
    // capability answer retries as point reads; transport errors fail the listing.
    if (reads.every((r) => r.status === "failure" && isMissingContractView(r.error)))
        return null;
    const blockNumber = Reads.required(reads[0], multicall.address, "getBlockNumber");
    const probe = reads[1];
    const hasStatusViews = probe?.status === "failure" && isMissingContractView(probe.error)
        ? false
        : Reads.required(probe, factory, "supportsInterface");
    const statuses = hasStatusViews ? Reads.required(reads[2], factory, "getPerpPoolStatuses") : undefined;
    return { blockNumber, hasStatusViews, statuses };
}
/** Read both gates together, then prove the candidate against each pool's bank. */
async function readCandidateGates(client, blockNumber, base, candidate) {
    const calls = base.flatMap((b) => [
        { address: b.pool, abi: ReadsAbi.perpPoolReadAbi, functionName: "marginBank" },
        { address: candidate, abi: ReadsAbi.marginBankReadAbi, functionName: "isPerpPoolRegistered", args: [b.pool] },
    ]);
    const reads = await Reads.readCalls(client, blockNumber, calls);
    const banks = [];
    const registrations = [];
    base.forEach((_, i) => {
        const bank = reads[2 * i] ?? Raise.unreachable("candidate bank without its input");
        const registration = reads[2 * i + 1] ?? Raise.unreachable("candidate registration without its input");
        if (bank.status === "failure")
            banks.push(bank);
        else if (typeof bank.result === "string" && isAddress(bank.result))
            banks.push({ status: "success", result: bank.result });
        else
            Raise.unreachable("marginBank ABI returned an invalid address");
        if (registration.status === "failure")
            registrations.push(registration);
        else if (typeof registration.result === "boolean")
            registrations.push({ status: "success", result: registration.result });
        else
            Raise.unreachable("registration ABI returned a non-boolean");
    });
    return { banks, registrations };
}
/**
 *  The pre-upgrade path: enumerate, then read each pool's base token and restriction
 *  state in batches. Produces exactly what `getPerpPoolStatuses` would, at
 *  O(markets / capacity) requests instead of one. The block pin keeps the rows from
 *  one height even when the batches are split.
 */
async function legacyStatuses(factory, client, blockNumber, useMulticall = true) {
    const pools = await client.readContract({
        address: factory,
        abi: ReadsAbi.perpPoolFactoryReadAbi,
        functionName: "getPerpPools",
        blockNumber,
    });
    // The base token and the restriction are REQUIRED fields. A pool missing either
    // fails the listing, as its point read did, rather than being guessed.
    const [baseTokens, restrictions] = await Promise.all([
        Reads.readEach(client, blockNumber, ReadsAbi.perpPoolFactoryReadAbi, "getBaseTokenForPool", pools.map((pool) => ({ address: factory, args: [pool] })), useMulticall),
        Reads.readEach(client, blockNumber, ReadsAbi.perpPoolReadAbi, "isRestricted", pools.map((pool) => ({ address: pool })), useMulticall),
    ]);
    return pools.map((pool, i) => ({
        pool,
        baseToken: Reads.required(baseTokens[i], factory, "getBaseTokenForPool"),
        restricted: Reads.required(restrictions[i], pool, "isRestricted"),
    }));
}
/**
 *  Just the tradeable markets — the common case, filtered from
 *  {@link listPerpPoolStatuses}. Chain tier.
 *
 * **Gotchas**
 *
 * - Throws if any market's registration gate is unreadable (a MarginBank predating `isPerpPoolRegistered`). Silently dropping those rows would return a SHORT list that looks authoritative — the one failure a caller could not detect — so this refuses rather than guesses. Use {@link listPerpPoolStatuses} to see the markets and decide for yourself.
 */
export async function listTradeablePerpPools(p, client, candidateMarginBank) {
    const statuses = await listPerpPoolStatuses(p, client, candidateMarginBank);
    const undetermined = statuses.filter((s) => s.tradeable === null);
    if (undetermined.length > 0) {
        throw new RpcError("listTradeablePerpPools", `cannot determine tradeability for ${undetermined.length} of ${statuses.length} perp markets: ` +
            `their registration gates could not be determined. Pools: ${undetermined.map((s) => s.pool).join(", ")}`, { cause: undetermined });
    }
    return statuses.filter((s) => s.tradeable).map((s) => s.pool);
}
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
export async function isPerpPoolRegistered(p, client) {
    return client.readContract({
        address: p.marginBank,
        abi: ReadsAbi.marginBankReadAbi,
        functionName: "isPerpPoolRegistered",
        args: [p.pool],
    });
}
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
export async function readPerpMarketFromChain(p, client) {
    const pool = { address: p.status.pool, abi: ReadsAbi.perpPoolReadAbi };
    const token = { address: p.status.baseToken, abi: ReadsAbi.erc20ReadAbi };
    const [book, risk, baseDecimals, baseSymbol, stopRegistry] = await Promise.all([
        client.readContract({ ...pool, functionName: "getOrderBookParameters" }),
        client.readContract({ ...pool, functionName: "getPerpPoolParameters" }),
        client.readContract({ ...token, functionName: "decimals" }),
        // A token that exposes no symbol() is a valid ERC-20; the row's own contract for
        // that case is null, so answer it rather than failing the whole listing. Only a
        // MISSING view earns that null: a timeout or a dropped connection is an operational
        // failure and must stay one, or discovery reports success with incomplete data.
        client
            .readContract({ ...token, functionName: "symbol" })
            .then(String)
            .catch((err) => {
            if (isMissingContractView(err))
                return null;
            throw err;
        }),
        // Feature-detected exactly as the status views are: a factory predating
        // IPerpPoolFactoryStopRegistry has no such selector, and that is a market with
        // no reachable TP/SL rather than a failed listing. An RPC outage still throws,
        // because isMissingView is deliberately narrow.
        client
            .readContract({
            address: p.factory,
            abi: ReadsAbi.perpPoolFactoryReadAbi,
            functionName: "getStopOrderRegistry",
            args: [p.status.pool],
        })
            .catch((err) => {
            if (isMissingContractView(err))
                return null;
            throw err;
        }),
    ]);
    const id = Markets.lower0x(p.status.pool);
    return {
        id,
        marketType: "PERP",
        poolAddress: id,
        lastPrice: null,
        lastTradeAt: null,
        // Placeholders — see the gotcha above. Zero is UNKNOWN here.
        cumulativeBaseVolume: "0",
        cumulativeQuoteVolume: "0",
        tradeCount: "0",
        createdAtTimestamp: "0",
        createdAtBlock: "0",
        baseDecimals: Number(baseDecimals),
        quoteDecimals: p.collateralDecimals,
        baseToken: Markets.lower0x(p.status.baseToken),
        quoteToken: Markets.lower0x(p.collateralToken),
        baseSymbol,
        quoteSymbol: p.collateralSymbol,
        baseIsNative: false,
        tickSize: book.tickSize.toString(),
        lotSize: book.lotSize.toString(),
        minQuantity: book.minQuantity.toString(),
        marginBank: Markets.lower0x(p.status.marginBank),
        initialMarginBps: Number(risk.initialMarginBps),
        // Zero is the factory's "no registry recorded" sentinel; this field's contract for
        // that is null, so a consumer has one check rather than two.
        stopRegistry: stopRegistry && stopRegistry !== zeroAddress ? Markets.lower0x(stopRegistry) : null,
        markPrice: null,
        markPriceUpdatedAt: null,
        fundingRate: null,
        cumulativeFundingPerUnit: null,
        indexPrice: null,
        fundingUpdatedAt: null,
        fundingWindowSec: null,
        fundingIntervalSec: null,
        openInterest: null,
        openInterestUpdatedAt: null,
    };
}
