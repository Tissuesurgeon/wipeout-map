import type { Address, Chain } from "viem";
import type { DebugEvent } from "./debug.js";
import type { LendAddresses } from "./lend/types.js";
/**
 * A standard WebSocket constructor selected by one configured exchange.
 *
 * **Details**
 *
 * The exchange owns each created socket. Its `close()` must promptly dispose
 * connecting and open work, stop replacement dials and safely observe retirement
 * errors. Sharing a constructor does not transfer or share socket ownership.
 * The standard interface cannot prove these resource obligations. In particular,
 * Node 22's native WebSocket is not a conforming custom disposal implementation.
 *
 * @category configuration
 */
export type SomniaMarketsWebSocketConstructor = new (url: string, protocols?: string | string[]) => WebSocket;
/**
 * Concrete SDK failures a supplied RPC constructor or socket member can throw.
 * Already typed failures keep their identity; other transport failures become
 * `RpcError` with the original value as cause.
 *
 * @category errors
 */
export type SomniaMarketsSocketFailure = import("./errors.js").InvalidInputError | import("./errors.js").NotConfiguredError | import("./errors.js").NotSupportedError | import("./errors.js").SignerRequiredError | import("./errors.js").IndexerError | import("./errors.js").IndexerUnavailableError | import("./errors.js").IndexerWaitTimeoutError | import("./errors.js").RpcError | import("./errors.js").ContractRevertError | import("./errors.js").TransactionOutcomeUnknownError | import("./errors.js").FillHistoryRestartRequiredError | import("./errors.js").FillHistoryUnavailableError | import("./errors.js").IncompleteHistoryError | import("./errors.js").CollateralOnWrongChainError | import("./errors.js").BridgeLiquidityError | import("./errors.js").BridgeDeliveryTimeoutError | import("./raise.js").InvariantError;
/**
 * Protocol contract addresses (all optional — features degrade if unset).
 *
 * @category configuration
 */
export interface SomniaMarketsAddresses {
    /** FakeOracle resolver (demo resolve/void). */
    fakeOracle?: Address;
    /**
     *  Per-venue collateral ERC-20 (the venue's quote/collateral token; on test
     *  environments this is the faucet-capable TestUSDC). Preferred over
     *  `testUsdc`, which remains as the legacy/fallback alias.
     */
    collateral?: Address;
    /**
     *  TestUSDC collateral (faucet + balances). Legacy/fallback alias for
     *  {@link SomniaMarketsAddresses.collateral}.
     */
    testUsdc?: Address;
    /**
     *  BinaryMarketsModule — the binary product's core module (complete-set
     *  mint/redeem, market creation, adapter approval). Needed by the trader
     *  writes, the hub-approval reads, and /system diagnostics.
     */
    binaryModule?: Address;
    /**
     *  MarketCreator factory. When set, the live tail watches MarketCreated and
     *  picks up new binary markets the block they deploy — no indexer round-trip.
     */
    marketCreator?: Address;
    /**
     *  ClobFactory — /system-diagnostics fallback when the module's live
     *  `clobFactory()` read fails; a live/config mismatch is flagged.
     */
    clobFactory?: Address;
    /**
     *  BinaryPool implementation behind the fleet (distinct from the factory's
     *  `binaryMarketImpl`). On beacon-generation deploys this is the impl the
     *  {@link SomniaMarketsAddresses.binaryPoolBeacon} points at; on pre-beacon
     *  deploys it is the EIP-1167 master copy the factory cloned. Not read by the
     *  SDK itself, but surfaced to apps — the explorer's system overview renders it.
     */
    binaryPoolImpl?: Address;
    /**
     *  The fleet's `UpgradeableBeacon` (beacon generation onwards). Every pool the
     *  factory deploys is a `BeaconProxy` against it, so upgrading the beacon moves
     *  the whole fleet at once. Absent on pre-beacon manifests, where pools are
     *  independent clones of {@link SomniaMarketsAddresses.binaryPoolImpl}.
     */
    binaryPoolBeacon?: Address;
    /**
     *  The permanent BinarySettlement singleton (settlement-extraction v2). Every
     *  pool finalizes its markets into it and every redemption routes through it,
     *  so a pool can be recycled onto the next market. Needed by the low-level
     *  `redeemDirect` / `claimOwed` / `getSettlement` trader methods, which throw
     *  if it is unset. Absent on pre-v2 (pool-redeem) deploys.
     */
    binarySettlement?: Address;
    /**
     *  Shared OperatorPermissionsRegistry — users operator-approve a SpotStopOrderRegistry
     *  here (once, globally) so it can place their stop order via the pool at trigger time.
     */
    operatorPermissionsRegistry?: Address;
    /**
     *  MarketsCore — the control-plane registry of operators, typed venues, and
     *  the module binding per market type. Needed by the operator/venue admin
     *  reads + `createOperatorAdmin` writes.
     */
    marketsCore?: Address;
    /**
     *  CollateralRouter periphery — the native-token (wrap/unwrap) + Permit2 entry
     *  over BinaryMarketsModule's complete-set flow. May be absent for an
     *  environment where only the plain-ERC-20 path is deployed; the router-based
     *  trader methods throw if it is unset rather than sending to the zero address.
     */
    collateralRouter?: Address;
    /**
     *  MarketCreatorFactory — stamps out per-operator/venue MarketCreator (+ its
     *  policy) instances, the operator "market machinery" layer. Needed by
     *  `createMarketCreatorAdmin` writes; the admin throws if it is unset.
     */
    marketCreatorFactory?: Address;
    /**
     *  v2 sibling of {@link SomniaMarketsAddresses.marketCreatorFactory} — stamps
     *  out `MarketCreatorV2` (interval/bucket-mode rolling series) instances.
     *  Additive: coexists with the v1 factory. Not read by
     *  `createMarketCreatorAdmin` automatically — pass it explicitly via that
     *  call's `factory` override to mint a v2 creator instead of v1. Undefined
     *  on deploys that predate it.
     */
    marketCreatorFactoryV2?: Address;
    /**
     *  The OracleHub proxy (Oracle v2 §8e) — the protocol's ONE
     *  governance-approved oracle adapter. Every market creation binds through it
     *  (content-addressed `scheduleQuestion` dedup, earmark-at-creation resolution
     *  funding + bounded-drain exact metering, payout-vector delivery). Needed by
     *  the OracleHub reads (`quoteCreateMarketValue`, `getSchedulingCost`,
     *  `earmarkedOf`, `resolveReserve`) and the `createOracleHubAdmin` writes; those throw if it
     *  is unset. Also the default `adapter` for
     *  `createMarketCreatorAdmin.createMarketCreator`.
     */
    oracleHub?: Address;
    /**
     * Legacy OracleAdapterFactory address retained for source compatibility.
     *
     *  @deprecated LEGACY (pre-oracle-v2): OracleAdapterFactory. The factory
     *  contract was deleted in Oracle v2 — use {@link SomniaMarketsAddresses.oracleHub}.
     *  Kept only so old configs keep type-checking; nothing in the SDK reads it.
     */
    oracleAdapterFactory?: Address;
    /**
     * Legacy shared oracle-adapter address retained for source compatibility.
     *
     *  @deprecated LEGACY (pre-oracle-v2): the shared ProphecyOracleAdapter proxy.
     *  Replaced by {@link SomniaMarketsAddresses.oracleHub}. Kept only so old
     *  configs keep type-checking; nothing in the SDK reads it.
     */
    sharedOracleAdapter?: Address;
    /**
     *  PerpPoolFactory — the on-chain authority on which perp markets exist.
     *
     *  Unnecessary ONLY while the indexer carries at least one perp row.
     *  {@link SomniaMarkets.loadMarkets} finds the factory from such a row: it
     *  carries its `marginBank`, and
     *  `MarginBank.getSystemConfig()` reports the factory the bank actually calls.
     *  That is the better source — it is the deployment's own view of its wiring,
     *  so it cannot drift from a stale config the way a hardcoded address can.
     *
     *  Set this for the one case the bootstrap cannot cover: an indexer with NO
     *  perp rows at all, where there is no `marginBank` to ask. That happens on a
     *  fresh reindex, and while an indexer is catching up below the factory's
     *  first deploy block. Without it, `loadMarkets` does not look for perps at
     *  all and returns an empty perp set with every error accessor clean;
     *  {@link SomniaMarkets.perpDiscoverySkipped} is what reports that state.
     *
     *  When set it takes precedence, so it also serves as an override while a
     *  bank's reported factory is being rotated.
     *
     *  `SOMNIA_TESTNET_ADDRESSES` and `SOMNIA_HIDEKI_TESTNET_ADDRESSES` set it, so
     *  a binding with either preset lists its perps without an indexer.
     *  `SOMNIA_MAINNET_ADDRESSES` does not set it. Because a set value takes
     *  precedence, these presets do not use the bank's factory. The preset value
     *  is fixed when the SDK version is released, so it can become stale after a
     *  perps redeploy. To use the bank's factory, pass a copy of the preset
     *  without this field.
     */
    perpPoolFactory?: Address;
    /**
     *  The Somnia price feed (`PriceFeedScheduler`). One contract holds every price
     *  under a symbol name. A perp pool's oracle reads the `<BASE>/USDC:PERP` entry for
     *  the mark price and the `<BASE>/USDC` entry for the index price. On some networks,
     *  the oracle combines the feed with another source. The feed emits `PricesUpdated`
     *  on every price write. `client.accountPositions.subscribe` has the node push the
     *  account's state on those writes, so marks and PnL follow every price. Without it,
     *  they follow a read every 5 s.
     *
     *  `SOMNIA_TESTNET_ADDRESSES` and `SOMNIA_HIDEKI_TESTNET_ADDRESSES` set it from the
     *  curated perps manifests. `SOMNIA_MAINNET_ADDRESSES` does not, because mainnet has
     *  no perps manifest yet.
     */
    priceFeedScheduler?: Address;
    /**
     * Candidate MarginBank for faster perp discovery. Use the deployment manifest's
     * bank address. This is a hint, never registration authority: each pool must name
     * this bank at the snapshot block before its registration result can be used.
     *
     * With modern factory status views and usable Multicall3, discovery takes two
     * serial rounds for up to 50 pools. More pools use concurrent bounded chunks.
     * Unknown or divergent banks use authoritative reads at the same block.
     * Omit this on chains without a perps deployment; zero disables the hint.
     */
    marginBank?: Address;
    /**
     *  SomniaLend money-market addresses — a THIRD-PARTY Aave v3 fork
     *  (docs.somnialend.finance), so unlike the first-party fields above these
     *  are NOT in the deployments manifests. Set `SOMNIA_MAINNET_LEND` or
     *  `SOMNIA_TESTNET_LEND` (from the root entry) for the
     *  published deployments. Backs the `client.lend` namespace; its methods
     *  throw a clear error when the address they need is unset.
     *
     *  **Gotchas**
     *
     *  This is the ONLY way to point the lend surface at a deployment — and the
     *  addresses must belong to this client's `chain`. A testnet deployment needs a
     *  testnet client; there is no way to graft one chain's lend addresses onto
     *  another chain's socket.
     *
     * **Example** (Configuring SomniaLend)
     *
     *  ```ts
     *  const exchange = new SomniaMarkets({
     *    ...config,
     *    addresses: { lend: SOMNIA_MAINNET_LEND },
     *  });
     *  const account = await exchange.client.lend.getAccount(me);
     *  console.log(`health factor ${account.healthFactor}`);
     *  ```
     */
    lend?: LendAddresses;
}
/**
 *  The realtime price-feed endpoint — the standalone EMA price-feed indexer
 *  (Hasura GraphQL). ONE endpoint serves every tracked asset (BTC/USDC, ETH/USDC,
 *  …); callers select an asset by filter. Snapshot + history read over HTTP; live
 *  prices stream over a Hasura WebSocket subscription.
 *
 * @category configuration
 */
export interface PriceFeedConfig {
    /** HTTP GraphQL endpoint (snapshot + history + candles, all assets). */
    url: string;
    /**
     *  WebSocket GraphQL endpoint for live subscriptions. Derived from `url`
     *  (http→ws, https→wss) when omitted.
     */
    wsUrl?: string;
    /**
     *  Quote asset to pin every read to (e.g. `"USDC"`), case-insensitive. The feed
     *  indexes SEVERAL quotes per base (`BTC/USDC`, `BTC/USDT`), so `base` alone is
     *  no longer a unique feed key: leaving this unset matches every quote, which
     *  double-counts a base that trades against more than one quote — duplicate
     *  candle buckets (a hard error in charting libs that require strictly
     *  ascending, unique timestamps), an arbitrary `Feed`/tick row per push.
     *
     *  **Required for a live watch.** `watchPrice`/`watchPrices` (and the price
     *  hooks and `SomniaMarkets.watchPrice`, which go through them) reject with a
     *  `NotConfiguredError` naming `config.priceFeed.quote` when it is unset. The
     *  tick tape streams on a `requestId` cursor, and one oracle request prices
     *  every symbol in the tick, so across quotes that cursor is not unique: a
     *  batch boundary between two rows sharing one would advance past the second
     *  and lose it. Unpinned reads double-count; an unpinned watch would drop data.
     *
     *  The one-shot reads (`fetchPrice`, `fetchPriceHistory`, `fetchPriceOHLCV`,
     *  `fetchPrices`, `listPriceFeeds`) still work unset, where double-counting is
     *  the only cost. Both shipped feed constants are pinned to USDC already.
     */
    quote?: string;
}
/**
 *  The known Somnia-testnet price feed (dev) — one endpoint serving every asset.
 *  Wire it up with `priceFeed: SOMNIA_TESTNET_PRICE_FEED`. Pinned to the USDC
 *  quote: the feed also holds now-stale USDT history, and matching both quotes
 *  double-counts each base (see {@link PriceFeedConfig.quote}).
 *
 *  This feed indexes the testnet `PriceFeedScheduler`. Use it with a testnet
 *  client. A mainnet client reads prices from the other chain if you use this
 *  feed. Use {@link SOMNIA_MAINNET_PRICE_FEED} instead.
 *
 * @category configuration
 */
export declare const SOMNIA_TESTNET_PRICE_FEED: PriceFeedConfig;
/**
 *  The Somnia-mainnet price feed. One endpoint serves every asset. Set it as
 *  `priceFeed: SOMNIA_MAINNET_PRICE_FEED`. Reads are pinned to the USDC quote
 *  (see {@link PriceFeedConfig.quote}).
 *
 *  This feed indexes the mainnet `PriceFeedScheduler`. Use it with a mainnet
 *  client. It is a different deployment from {@link SOMNIA_TESTNET_PRICE_FEED},
 *  not a copy of it. Each feed indexes one chain. The names do not say which
 *  chain. To identify a feed, compare a `Feed` row's block number with the
 *  block height of each chain.
 *
 *  This feed carries fewer symbols than the testnet feed. Code written for the
 *  testnet asset list can therefore fail here. Read the feed catalog to learn
 *  which bases exist. A base the feed does not carry returns no rows. It does
 *  not raise an error.
 *
 * @category configuration
 */
export declare const SOMNIA_MAINNET_PRICE_FEED: PriceFeedConfig;
/**
 *  Fixed EIP-1559 fees every SDK-signed write uses. The SDK never estimates fees
 *  — no per-order eth_gasPrice / fee-history round-trip. `maxFeePerGas` is a
 *  ceiling (the tx pays base fee + tip, the rest is refunded), so a generous
 *  fixed value costs nothing extra on Somnia's flat gas market.
 *
 * @category configuration
 */
export interface FixedFees {
    /** Total fee ceiling (wei per gas); the unspent margin over base fee + tip refunds. */
    maxFeePerGas: bigint;
    /** Priority tip (wei per gas) paid to the proposer on top of the base fee. */
    maxPriorityFeePerGas: bigint;
}
/**
 *  SDK default for {@link ClientConfig.fees}: 60 gwei ceiling (~10× the observed
 *  Somnia base fee of 6 gwei), zero tip — instant BFT inclusion needs no bribe.
 *
 * @category configuration
 */
export declare const DEFAULT_FEES: FixedFees;
/**
 *  Fixed gas ceiling every SDK-signed write uses (10M). Gas is never estimated —
 *  Somnia's gas schedule is far dearer than mainnet's (measured live, even an
 *  ERC-20 `approve` runs out of gas under a 1M limit), and skipping the
 *  per-call `eth_estimateGas` round-trip is part of the one-round-trip write
 *  doctrine. × 60 gwei this is a 0.6 STT envelope; the unused remainder is not
 *  charged, but the mempool admits a transaction only when the ceiling is
 *  funded on top of its `value`. Every write surface accepts a per-call `gas`
 *  override.
 */
export declare const DEFAULT_GAS = 10000000n;
/**
 *  Bounds on how hard one client may push its indexer: in-flight cap, circuit
 *  breaker, backoff schedule. They only ever reduce load, so
 *  {@link DEFAULT_INDEXER_LIMITS} is safe to leave alone.
 *
 *  **Gotchas**
 *
 *  The SDK does not retry by default (`maxAttempts` is 1). A caller that already
 *  retries — a React Query `retry`, a polling loop — must not raise it, or the
 *  two multiply.
 *
 * @category configuration
 */
export interface IndexerLimits {
    /**
     *  Reads on the wire at once (default 12). The rest queue locally, holding no
     *  indexer connection, and still honour their caller's abort signal.
     */
    maxInFlight?: number;
    /**
     *  Consecutive endpoint failures that open the breaker (default 5): timeouts
     *  and overload responses (HTTP 429, 502, 503, 504). Only these count — a 400 is the query's fault. Any answer clears the count.
     */
    breakerThreshold?: number;
    /**
     *  How long the breaker stays open (default 30_000 ms). Reads fail at once
     *  with {@link IndexerUnavailableError} and nothing is sent. Then one trial
     *  read decides: an answer closes the breaker, another failure restarts the wait.
     */
    breakerCooldownMs?: number;
    /** First backoff step in ms (default 500), doubled per attempt before jitter. */
    baseDelayMs?: number;
    /** Ceiling the doubling stops at, in ms (default 30_000), applied before jitter. */
    maxDelayMs?: number;
    /** Attempts the boundary makes per read (default 1 — no retry). See the gotcha above. */
    maxAttempts?: number;
    /**
     *  Reads allowed to WAIT for a slot (default 100). Past this the read is
     *  refused with {@link IndexerUnavailableError} rather than queued, so a
     *  client whose arrivals outrun the cap sheds load instead of growing a
     *  backlog that outlives the requests waiting on it.
     */
    maxQueued?: number;
}
/**
 *  Conservative defaults for {@link ClientConfig.indexerLimits}: no boundary
 *  retry, a per-page-sized cap, and five endpoint failures before the breaker opens.
 *
 * @category configuration
 */
export declare const DEFAULT_INDEXER_LIMITS: Readonly<Required<IndexerLimits>>;
/**
 *  Delay before retry `attempt` (0-based): exponential backoff with FULL jitter,
 *  `random` scaled onto `[0, base * 2 ** attempt]`, capped at `maxDelayMs`.
 *
 *  **Details**
 *
 *  Full jitter, not a fixed interval and not bare doubling — both leave clients
 *  retrying in lockstep, which is how a slow endpoint becomes a storm. The
 *  caller supplies the draw (`Math.random()` in production), so the function is
 *  pure: the same inputs give the same delay, and a poll loop outside the SDK
 *  can pace itself on the same schedule.
 *
 * **Example** (Pacing a poll loop on the SDK schedule)
 *
 *  ```ts
 *  import { nextBackoffDelayMs } from "@somnia-chain/markets-sdk";
 *
 *  let failures = 0;
 *  for (;;) {
 *    const ok = await readOnce();
 *    failures = ok ? 0 : failures + 1;
 *    await new Promise((r) => setTimeout(r, failures ? nextBackoffDelayMs(failures - 1, Math.random()) : 60_000));
 *  }
 *  ```
 *
 * @throws {@link InvalidInputError} If `attempt` is not a finite number >= 0, `random` is outside `[0, 1)`, or `limits.baseDelayMs`/`limits.maxDelayMs` is not a finite number > 0.
 * @category configuration
 */
export declare function nextBackoffDelayMs(attempt: number, random: number, limits?: IndexerLimits): number;
/**
 *  A delay bound must be finite and POSITIVE. Zero is rejected along with the
 *  negatives: `baseDelayMs: 0` or `maxDelayMs: 0` pins every draw at zero, so
 *  a raised `maxAttempts` retries back to back — the storm this paces away.
 */
export declare function positiveDelay(value: number | undefined, fallback: number, field: string): number;
/**
 *  Configuration for a {@link SomniaMarketsClient}. Each transport is required
 *  only by the features that use it: `indexerUrl` powers the indexer reads and
 *  the live watches' snapshot hydration (omit it for a chain-only client —
 *  smart accounts, executors, on-chain reads — and those reads throw
 *  {@link NotConfiguredError}); `chain` + `wsRpcUrl` power the live tail,
 *  on-chain reads, and writes, but the WebSocket socket is opened lazily, so an
 *  indexer-only client (e.g. server-side GraphQL reads) that never touches the
 *  chain never opens one.
 *
 * @category configuration
 */
export interface ClientConfig {
    /**
     * Optional diagnostic, off by default. At most once per interval, recover logs
     * through one target and compare both top-N sides at that block and timestamp.
     * Costs chunked getLogs plus one header and two book reads per watched pool.
     * Failures and retained divergence evidence appear in getLiveStatus().
     * It never replaces seed orders or the event-derived store.
     */
    reconciliation?: TailReconciliationConfig;
    /**
     *  Envio/Hasura GraphQL endpoint (HTTP). Same-origin relative paths are fine.
     *  Optional: a chain-only client (smart accounts, executors, on-chain reads)
     *  needs none; every indexer read and live watch then throws
     *  {@link NotConfiguredError} naming this field. An empty string counts as
     *  absent.
     */
    indexerUrl?: string;
    /**
     *  The indexer's GraphQL WebSocket endpoint, for live account views
     *  (`client.accountOrders.subscribe`).
     *
     *  Optional: an absolute `http://` or `https://` {@link ClientConfig.indexerUrl}
     *  gives it, as the same address with `ws://` or `wss://`. Set it when `indexerUrl`
     *  is a relative path or when subscriptions are served from another address. Without
     *  either, `subscribe` throws {@link NotConfiguredError} naming this field.
     */
    indexerWsUrl?: string;
    /**
     *  Extra headers sent with every indexer request — e.g. a Hasura role /
     *  admin-secret for SERVER-side reads that need privileges the public role
     *  lacks (notably `_aggregate` fields, which envio hides from the public
     *  role). MUST stay server-only; never construct a browser client with a
     *  secret here.
     */
    indexerHeaders?: Record<string, string>;
    /**
     *  Bounds on how hard this client may push {@link ClientConfig.indexerUrl}.
     *  Defaults to {@link DEFAULT_INDEXER_LIMITS}; supplied fields override it
     *  one by one. Owned by this client: two clients on one endpoint keep
     *  separate counters, so one client's outage never fails another's reads.
     *
     *  Throws {@link InvalidInputError} at construction on a bound the governor
     *  cannot use: a count (`maxInFlight`, `breakerThreshold`, `maxAttempts`,
     *  `maxQueued`) that is not a whole number of at least 1, a delay of `0` or
     *  less, or any non-finite value. A cap of `0` would queue every read forever,
     *  a fractional one would admit more reads than it names, and a zero or `NaN`
     *  delay would fire every retry immediately, so none is accepted quietly.
     */
    indexerLimits?: IndexerLimits;
    /**
     *  Cancels this client's in-flight indexer reads and receipt confirmations — pass one
     *  per request on a server, or a component's controller signal in a UI, so a
     *  navigation away stops work already on the wire.
     *
     *  **Details**
     *
     *  Client-wide, not per-read: it is combined with the SDK's own request timeout
     *  (whichever fires first wins). An abort re-throws YOUR abort reason
     *  unwrapped rather than an {@link IndexerError}, so `name === "AbortError"`
     *  checks keep working — a cancellation is not an indexer failure.
     *
     *  **Gotchas**
     *
     *  Receipt confirmations stop with TransactionOutcomeUnknownError after
     *  broadcast, retaining the transaction hash and your abort reason in cause.
     *  Local and wallet writes canceled before broadcast rethrow your reason.
     *  Chain reads go over the WebSocket transport,
     *  which is bounded by its own request timeout instead. Its abort also closes the
     *  client's account views (`accountOrders`, `accountPositions` and
     *  `accountBalances`) and its ADL queue views (`perpAdlQueue`) for good: every
     *  live view ends with `closed`, a later `subscribe` gets only a `closed` view,
     *  and a later `getSnapshot` rejects with your abort reason. `stopLive()` ends
     *  live views too, but leaves the client usable.
     */
    signal?: AbortSignal;
    /** viem chain the markets live on. */
    chain: Chain;
    /**
     *  Chain WebSocket RPC — the single chain transport. The live tail subscribes
     *  to logs + new heads over it, and all on-chain reads/writes use it too.
     *  There is no HTTP fallback: the SDK assumes a healthy WebSocket.
     *
     *  Optional when `chain` carries a WebSocket endpoint — every definition in
     *  `@somnia-chain/markets-sdk/chains` does (`rpcUrls.default.webSocket`), so
     *  with those this is only an override. viem's own `somniaTestnet` lacks one,
     *  so with that chain (or any ws-less definition) it stays required and the
     *  first chain touch throws {@link NotConfiguredError} without it.
     */
    wsRpcUrl?: string;
    /**
     *  Fixed fees for SDK-signed writes (default {@link DEFAULT_FEES}). Override
     *  for a chain whose base fee can exceed the default ceiling.
     */
    fees?: FixedFees;
    /**
     *  Protocol contract addresses — used by the write client, the live tail's
     *  factory watch, and /system reads.
     */
    addresses?: SomniaMarketsAddresses;
    /**
     *  The realtime price-feed endpoint (see {@link PriceFeedConfig}). One endpoint
     *  serves every asset; callers filter by asset. Required only for the price-feed
     *  methods (`watchPrice`, `getLivePrice`, `fetchPrices`, …); a client that never
     *  touches prices needs none.
     */
    priceFeed?: PriceFeedConfig;
    /**
     *  Opt-in debug/tracing sink. Unset (the default) means the SDK emits nothing
     *  and does no debug-only work. When set, the client sends every
     *  {@link DebugEvent} it produces — structured log lines plus span
     *  start/annotate/end events around trader calls and live-tail hydration —
     *  and the sink decides everything else: filtering, formatting, toggling, or
     *  forwarding to a real tracer (the shape maps 1:1 onto OpenTelemetry). Two
     *  sinks ship with the package: `consoleDebugSink` (indented span tree) and
     *  `debugCollector` (test capture). The toggle mechanism belongs to the app,
     *  not the SDK:
     *
     * **Example** (Enabling debug output)
     *
     * Explorer (dev) — flip on from devtools via localStorage; a Node bot gates
     * a JSON-lines sink on an env var instead:
     *
     * ```ts
     * const devExchange = new SomniaMarkets({
     *   ...config,
     *   debug: localStorage.getItem("sdk-debug")
     *     ? consoleDebugSink()
     *     : undefined,
     * });
     *
     * const botExchange = new SomniaMarkets({
     *   ...config,
     *   debug: process.env.SDK_DEBUG
     *     ? (e) => console.log(JSON.stringify(e, (_, v) => (typeof v === "bigint" ? v.toString() : v)))
     *     : undefined,
     * });
     * ```
     */
    debug?: (e: DebugEvent) => void;
}
/**
 *  One chain's engine configuration inside a multi-chain {@link SomniaMarkets}.
 *  Exactly a {@link ClientConfig}: the chain, its indexer, its socket, its
 *  protocol addresses and its fee envelope. The facade builds one engine per
 *  binding and keeps their sockets, indexer connections, nonce lanes and fee
 *  envelopes separate.
 *
 * @category configuration
 */
export type ChainBinding = ClientConfig;
/**
 *  The indexer WebSocket endpoint of a client: `indexerWsUrl` when set, or the WebSocket
 *  twin of an absolute `http(s)://` `indexerUrl`. `undefined` when neither gives one.
 */
export declare function resolveIndexerWsUrl(config: Pick<ClientConfig, "indexerUrl" | "indexerWsUrl">): string | undefined;
/**
 *  Resolve the price-feed endpoint from config, filling in the WS URL from the
 *  HTTP one (http→ws, https→wss) when unset. Throws a clear error if no endpoint
 *  is configured.
 */
export declare function resolvePriceFeed(config: ClientConfig): {
    url: string;
    wsUrl: string;
    quote: string | undefined;
};
/** Opt-in live-book diagnostic bounds. @category configuration */
export interface TailReconciliationConfig {
    /** Positive block interval. Heads coalesce while a comparison is pending. */
    blockInterval: bigint;
    /** Top levels per side, an integer from 1 to 100. */
    depth: number;
}
