import type { Market } from "../markets.js";
import type { PerpPoolStatus } from "../perp/registry.js";
/**
 *  Market kind in ccxt vocabulary: "swap" is a linear perp; "binary" /
 *  "categorical" are outcome markets ("categorical" is reserved — no market
 *  carries it yet).
 *
 * @category models
 */
export type UnifiedMarketType = "spot" | "swap" | "binary" | "categorical";
/**
 * A unified market object. `info` is the native `Market` union row.
 *
 * @category models
 */
export interface UnifiedMarket {
    /** Venue-internal id (the native market id: bytes32 for binary, pool for spot). */
    id: string;
    /** Numeric chain id the market lives on. */
    chainId: number;
    /**
     *  Canonical MARKET symbol (no outcome suffix), e.g. "SOMI/USDC" or
     *  "BTC-95000-31DEC26/USDC". Key into `exchange.markets`.
     */
    symbol: string;
    /** Market kind — see {@link UnifiedMarketType}. */
    type: UnifiedMarketType;
    /**
     *  Base currency code — for outcome markets, the market's asset-strike-expiry
     *  stem (everything before the slash).
     */
    base: string;
    /** Quote currency code (outcome markets: the collateral token's code). */
    quote: string;
    /**
     *  Settlement currency code. Set on swap (== quote for a linear perp) and
     *  outcome markets; absent on spot.
     */
    settle?: string;
    /** Derived from live/indexed lifecycle — false once trading is impossible. */
    active: boolean;
    /** ccxt's derivative flag: true only for swap (perp) markets. */
    contract: boolean;
    /**
     *  Decimal places implied by the market's tick (price) and lot (amount)
     *  grids — what {@link SomniaMarkets.priceToPrecision} snaps to.
     */
    precision: {
        /** Price decimal places (from the tick grid). */
        price: number;
        /** Amount decimal places (from the lot grid). */
        amount: number;
    };
    /** Order-size floors, human units; `min` is absent when the pool sets none. */
    limits: {
        /** Amount (order size) bounds. */
        amount: {
            /** Minimum order size, human base units. */
            min?: number;
        };
    };
    /** Outcome tradables (binary/categorical). Absent on spot/swap. */
    outcomes?: {
        /** The outcome's tradable symbol, e.g. "BTC-95000-31DEC26/USDC#YES". */
        symbol: string;
        /** Outcome label ("YES" / "NO"). */
        label: string;
        /** Outcome index on the ERC-6909 singleton (0 = YES, 1 = NO). */
        index: number;
    }[];
    /**
     *  Whether the indexer has a row for this market.
     *
     *  True for every spot and outcome market — those are discovered through the
     *  indexer, so a row is the only way they appear at all. It can be **false only
     *  on a perp**, which `loadMarkets()` also discovers from the PerpPoolFactory:
     *  a market deployed after the indexer's perp manifest was written is present
     *  on the chain and absent from the indexer.
     *
     *  **Branch on this before reading anything history-derived.** On a market with
     *  `indexed: false`, `info.cumulativeBaseVolume`, `info.cumulativeQuoteVolume`,
     *  `info.tradeCount`, `info.createdAtTimestamp` and `info.createdAtBlock` are
     *  `"0"` placeholders meaning UNKNOWN — not "never traded" — and every funding,
     *  mark-price and open-interest field is null.
     *
     *  `info.lastPrice` and `info.lastTradeAt` need care of their own. They are null
     *  here for the same reason, but on an INDEXED market null carries the narrower
     *  meaning "no fill yet". So null on a market with `indexed: false` says nothing
     *  about whether it has traded, and rendering it as "no trades" is wrong.
     *
     *  The chain-backed reads work in full — positions, collateral, the order book —
     *  and the indexer-backed ones (candles, fills, order history, portfolio) return
     *  empty. TP/SL depends on `info.stopRegistry`, which comes from the factory and is
     *  null when it records none.
     *
     *  **Placement is a separate question from `indexed`.** Discovery reports every
     *  factory pool, including restricted and unregistered ones, so a market being
     *  present here does not mean an order will be accepted: check
     *  {@link UnifiedMarket.active} or {@link UnifiedMarket.perpStatus}. A restricted
     *  market takes closes and cancels but reverts anything position-increasing.
     */
    indexed: boolean;
    /**
     *  Live tradeability gates, perp markets only.
     *
     *  Absent on spot and outcome markets; on every market when no PerpPoolFactory could
     *  be reached (see `SomniaMarkets.perpDiscoveryError`); and per-market on an indexed
     *  perp the reachable factory does not list — which happens after a factory rotation,
     *  and leaves that market's `active` falling back to `true`.
     *
     *  Read from the chain on each `loadMarkets()`, because "deployed" is not
     *  "tradeable" and the two gates fail for unrelated reasons — see
     *  {@link PerpPoolStatus}. {@link UnifiedMarket.active} folds them together;
     *  these are here for a consumer that must tell a wound-down market from one
     *  that was never activated.
     */
    perpStatus?: Pick<PerpPoolStatus, "restricted" | "registered" | "tradeable">;
    /** The native `Market` union row (raw strings/bigint-scale fields). */
    info: Market;
}
/**
 * An L2 book: [price, amount] pairs, best first, human units.
 *
 * @category models
 */
export interface UnifiedOrderBook {
    /** Pinned chain block or scope applied-event watermark; absent without provenance. */
    blockNumber?: bigint;
    /**
     *  The tradable symbol this book view addresses (a NO book is the YES book
     *  inverted into NO terms).
     */
    symbol: string;
    /** Numeric chain id the market lives on. */
    chainId: number;
    /** Buy side, best (highest) bid first. */
    bids: [number, number][];
    /** Sell side, best (lowest) ask first. */
    asks: [number, number][];
    /** When this view was assembled (ms) — local clock, not a block timestamp. */
    timestamp?: number;
    /** The native book (raw bigint levels; YES terms for binary). */
    info?: unknown;
}
/**
 * A fill, in the tradable's own terms (prices/amounts human units).
 *
 * @category models
 */
export interface UnifiedTrade {
    /** Source fill block, preserved in outcome views. Absent when the input has no block provenance. */
    blockNumber?: bigint;
    /** Source log position. Absent when the input has no log provenance. */
    logIndex?: number;
    /** Native fill id — unique per fill, stable across reads. */
    id: string;
    /** The tradable symbol the fill is viewed on. */
    symbol: string;
    /** Numeric chain id the market lives on. */
    chainId: number;
    /** Fill price, human units (binary: this outcome's probability). */
    price: number;
    /** Filled quantity, human base units. */
    amount: number;
    /** price × amount, in quote units. */
    cost: number;
    /** Taker direction on this tradable's book; undefined when unresolved. */
    side?: "buy" | "sell";
    /** Tx hash the fill landed in, when known. */
    txHash?: string;
    /** Fill block timestamp (ms). */
    timestamp: number;
    /** ISO-8601 of `timestamp`. */
    datetime: string;
    /** The native fill row (raw units, maker/taker addresses). */
    info: unknown;
}
/**
 *  Unified order lifecycle: "closed" = fully filled; "canceled" covers both
 *  explicit cancels and an IOC/market remainder that couldn't rest.
 *
 * @category models
 */
export type UnifiedOrderStatus = "open" | "closed" | "canceled" | "expired";
/**
 * An order, in the tradable's own terms (prices/amounts human units).
 *
 * @category models
 */
export interface UnifiedOrder {
    /**
     *  On-chain order id (decimal string) — pass to {@link SomniaMarkets.cancelOrder}.
     *  Falls back to the tx hash for a write that left nothing resting.
     */
    id: string;
    /** The tradable symbol the order is viewed on. */
    symbol: string;
    /** Numeric chain id the market lives on. */
    chainId: number;
    /**
     *  Requested execution style ("market" computed a crossing IOC limit).
     *
     *  **Absent on orders read back from the indexer** — `fetchOrders`,
     *  `fetchOpenOrders` and `watchOrders` all leave it undefined. The pools do
     *  not emit the order type: `OrderPlaced` carries a `placedOrder` struct with
     *  no order-type member, and binary pools emit only the YES/NO side, so the
     *  indexer has nothing to store and the SDK has nothing to read. Populating
     *  it needs a contract change.
     *
     *  Present only where the value is genuinely known: on the result of
     *  {@link SomniaMarkets.createOrder}, which echoes the caller's own argument.
     *  ({@link UnifiedStopOrder.type} is always known — the stop registry does
     *  emit the order type.)
     */
    type?: "limit" | "market";
    /** Direction on this tradable's book (a NO buy is a YES sell internally). */
    side: "buy" | "sell";
    /** Limit price, human units; absent when unknown. */
    price?: number;
    /** Full order size, human base units. */
    amount: number;
    /** Quantity filled so far, human base units. */
    filled: number;
    /** Quantity still open (`amount − filled`), human base units. */
    remaining: number;
    /** Lifecycle state — see {@link UnifiedOrderStatus}. */
    status: UnifiedOrderStatus;
    /** Tx hash the order was placed in, when known. */
    txHash?: string;
    /** Placement time (ms); write results stamp the local clock. */
    timestamp?: number;
    /** ISO-8601 of `timestamp`. */
    datetime?: string;
    /** The native order row / {@link PlaceOrderResult}. */
    info: unknown;
}
/**
 * A pending stop order's lifecycle, unified vocabulary.
 *
 * @category models
 */
export type UnifiedStopOrderStatus = "pending" | "triggered" | "canceled" | "failed";
/**
 *  A stop / take-profit order resting OFF the book on the market's
 *  SpotStopOrderRegistry, human units. Fires as a market or limit order when
 *  the pool's mark price crosses `triggerPrice`.
 *
 * @category models
 */
export interface UnifiedStopOrder {
    /** Registry order id (decimal string) — pass to {@link SomniaMarkets.cancelStopOrder}. */
    id: string;
    /** The spot tradable the stop targets. */
    symbol: string;
    /** Numeric chain id the market lives on. */
    chainId: number;
    /** Execution style at trigger time. */
    type: "limit" | "market";
    /** Direction of the triggered order. */
    side: "buy" | "sell";
    /** Order size, human base units. */
    amount: number;
    /** Mark price that arms the trigger, human quote units. */
    triggerPrice: number;
    /** Which side of the mark the trigger arms on. */
    triggerDirection: "above" | "below";
    /**
     *  Limit price of the triggered order (limit stops only), human quote units.
     *
     *  Undefined when unknown, including limit stops returned by {@link
     *  SomniaMarkets.fetchOpenStopOrders}. Treat undefined as unknown, not zero.
     */
    price?: number;
    /** Lifecycle state — see {@link UnifiedStopOrderStatus}. */
    status: UnifiedStopOrderStatus;
    /** The spot order id the trigger produced, once it fired. */
    triggeredOrderId?: string;
    /** Creation time (ms). */
    timestamp?: number;
    /** ISO-8601 of `timestamp`. */
    datetime?: string;
    /** Tx hash of the create, when known (write results only). */
    txHash?: string;
    /** The native registry row / write result. */
    info: unknown;
}
/**
 *  One currency's balance, human units (ccxt shape). For spot/binary, funds
 *  escrowed in resting orders live in the pools — not the wallet — so `used`
 *  is 0 and `free === total`. NOTE: this "used is 0" property is a fact about
 *  wallet-held tokens, not a law of the venue — perp collateral IS locked
 *  (MarginBank margin against open positions), and a margin-aware
 *  `fetchBalance` arm must report it through `used` rather than pretending
 *  the invariant generalizes.
 *
 * @category models
 */
export interface UnifiedBalance {
    /** Spendable balance. */
    free: number;
    /** Locked balance (0 for wallet-held spot/binary tokens; perp margin when reported). */
    used: number;
    /** `free + used`, human units. */
    total: number;
    /**
     *  The same figures per chain, keyed by numeric chain id. The top-level
     *  numbers are the sum across every configured chain; this is where they came
     *  from. A single-chain exchange reports one entry. The native coin is one
     *  asset across chains (post-bridge SOMI on Hideki is the same SOMI), so it
     *  aggregates under one code and breaks down here.
     */
    byChain: Record<number, UnifiedChainBalance>;
}
/**
 * One chain's share of a {@link UnifiedBalance}.
 *
 * @category models
 */
export interface UnifiedChainBalance {
    /** Spendable balance on this chain. */
    free: number;
    /** Locked balance on this chain. */
    used: number;
    /** `free + used` on this chain, human units. */
    total: number;
}
/**
 * Balances keyed by currency code, plus the raw reads under `info`.
 *
 * @category models
 */
export interface UnifiedBalances {
    [code: string]: UnifiedBalance;
}
/**
 * An OHLCV row: [timestampMs, open, high, low, close, volume(base)].
 *
 * @category models
 */
export type UnifiedOHLCV = [number, number, number, number, number, number];
/**
 *  A rolling 24h market snapshot (ccxt ticker shape), human units. Absent
 *  fields mean the window had no trades to derive them from.
 *
 * @category models
 */
export interface UnifiedTicker {
    /** The tradable symbol the ticker describes. */
    symbol: string;
    /** Numeric chain id the market lives on. */
    chainId: number;
    /** When this snapshot was computed (ms, local clock). */
    timestamp: number;
    /** ISO-8601 of `timestamp`. */
    datetime: string;
    /** Highest fill price in the window. */
    high?: number;
    /** Lowest fill price in the window. */
    low?: number;
    /** First fill price in the window. */
    open?: number;
    /** Most recent fill price (may predate the window on quiet markets). */
    last?: number;
    /**
     *  When the trade behind `last` happened (ms).
     *
     *  Present on BOTH paths that produce a `last`. A candle stamps its bucket
     *  start. The cached fallback — the market row's lifetime last price, used
     *  when the candle window is empty — stamps that row's `lastTradeAt`, which
     *  can be much older than the window. Compare the timestamp; do not read
     *  presence alone as a freshness signal.
     *
     *  ABSENCE IS MEANINGFUL, and narrower than it looks. No `lastSource` means
     *  either there is no `last` at all, or the cached fallback supplied `last`
     *  while the row carried no `lastTradeAt`. In both cases no provenance
     *  exists, so a consumer that needs a fresh print must treat `last` as stale.
     *
     *  Read it against {@link statsAsOf}, not against `timestamp`: `timestamp` is
     *  when this snapshot was assembled and says nothing about either half's age.
     */
    lastSource?: {
        /** When the trade happened (ms). */
        timestamp: number;
    };
    /**
     *  The end of the window the 24h statistics (`open`, `high`, `low`, `change`,
     *  `percentage`, `baseVolume`, `quoteVolume`) were folded over (ms).
     *
     *  This is the statistics' own as-of, derived from the candle window — NOT the
     *  response time. Absent when the window held no candles to fold.
     */
    statsAsOf?: number;
    /** `last − open`, when both are known. */
    change?: number;
    /** `change / open` as a plain fraction (0.05 = +5%), when derivable. */
    percentage?: number;
    /**
     *  Σ base-asset volume over the window.
     *
     *  Absent when {@link statsState} is `"unavailable"` — there is no honest
     *  number to report then. A `0` means a successful read over a window with no
     *  fills, which is a true zero. Branch on `statsState`, not on absence.
     */
    baseVolume?: number;
    /**
     *  Σ quote-asset volume over the window.
     *
     *  Absent when {@link statsState} is `"unavailable"`. See {@link baseVolume}.
     */
    quoteVolume?: number;
    /**
     *  Whether the 24h statistics above were read, and WHY when they were not.
     *
     *  Two states, always one of them:
     *
     *  - `"ok"` — the candle window was read. `baseVolume` and `quoteVolume` are
     *    present. They are `0` when the window held no fills, which is a true
     *    zero and not a missing value.
     *  - `"unavailable"` — the statistics could not be read. Either the candle
     *    request failed with an `IndexerError`, or the market is `indexed: false`
     *    and no candle request was sent. `open`, `high`, `low`, `change`,
     *    `percentage`, `statsAsOf`, `baseVolume` and `quoteVolume` are ALL absent,
     *    and {@link info} carries no fold.
     *
     *  The call still resolves in the `"unavailable"` state, and the perp chain
     *  fields below are still read. That is the point of the field: a candle
     *  outage must not take down mark price, index price, funding and open
     *  interest, which come from chain and would have worked.
     *
     *  `last` and `lastSource` are independent of this state. They still come
     *  from the cached market row when it carries them.
     */
    statsState: "ok" | "unavailable";
    /**
     *  PERP ONLY — mark price, human quote units.
     *
     *  Undefined on spot/binary, and undefined on a perp whose mark is unusable —
     *  either the feed reported stale, or the price is zero. A zero mark is never
     *  published: flattened to a number it reads as a real price, and downstream an
     *  unguarded `markPrice - entryPrice` becomes a 100% loss on every open position.
     */
    markPrice?: number;
    /** PERP ONLY — oracle index price, human quote units. Undefined on spot/binary. */
    indexPrice?: number;
    /**
     *  PERP ONLY — funding rate per **8 HOURS** as a plain fraction (0.0001 = 0.01%).
     *
     *  The same axis {@link UnifiedFundingRate.fundingRate} and `fetchFundingRateHistory`
     *  use, deliberately: a header reading one basis while the chart beside it reads
     *  another is a wrong number that looks right. NOT the amount charged per settlement —
     *  that is this divided by `fundingWindowSec / fundingIntervalSec` (8 on every live
     *  pool; it has been 96 at a 300s cadence), and `info.perp` carries both figures. On a
     *  historical catch-up row, multiply by that row's `intervalsAccrued` — one settlement
     *  can charge more than one interval's worth.
     */
    fundingRate?: number;
    /**
     *  PERP ONLY — when funding next settles (ms). Settlement is permissionless and lazy,
     *  so a past value means a settlement is DUE, not that anything is broken.
     */
    fundingTimestamp?: number;
    /**
     *  PERP ONLY — total open interest in base units.
     *
     *  ONE counter, not a long/short pair: in a matched CLOB the short side is provably
     *  equal, so there is nothing to sum.
     */
    openInterest?: number;
    /**
     *  Whether the perp chain fields above are present, and WHY when they are not.
     *
     *  Three states, always one of them:
     *
     *  - `"not-applicable"` — spot or binary. No perp fields exist to report.
     *  - `"ok"` — a perp, and its chain state was read. The perp fields are present.
     *  - `"degraded"` — a perp whose chain state read FAILED. The perp fields are
     *    absent and the 24h half below is still valid.
     *
     *  Without this, a missing `markPrice` is ambiguous: it reads the same on a
     *  spot market as on a perp whose oracle reverted. The degrade is deliberate —
     *  losing candle statistics to an oracle outage would be worse — but it must be
     *  visible, so branch on this rather than on the absence of a field.
     */
    perpState: "not-applicable" | "ok" | "degraded";
    /**
     *  The raw fold this snapshot came from (raw-unit bigints). On a perp it also carries
     *  `perp`, the full on-chain state — including `fundingWindowSec` /
     *  `fundingIntervalSec` for re-basing the funding rate.
     *
     *  There is no fold to carry when {@link statsState} is `"unavailable"`. This
     *  is then `undefined` on a spot or binary market, and carries only `perp` on
     *  a perp. Check `statsState` before reading a fold field off it; the type is
     *  `unknown`, so the compiler cannot warn you.
     */
    info: unknown;
}
/**
 * A perp funding-rate snapshot (live chain read; rates are fractions, not %).
 *
 * @category models
 */
export interface UnifiedFundingRate {
    /** The perp's tradable symbol, e.g. "BTC/USDSO:USDSO". */
    symbol: string;
    /** Numeric chain id the market lives on. */
    chainId: number;
    /**
     *  Mark price, human quote units.
     *
     *  Undefined when the mark feed is stale — a live read reports that explicitly, and a
     *  historical row carries the contract's 0 sentinel, neither of which should be
     *  flattened to a price of zero.
     */
    markPrice: number | undefined;
    /** Oracle index price, human quote units. */
    indexPrice: number;
    /**
     *  Funding rate per 8 HOURS as a plain fraction (0.0001 = 0.01%).
     *
     *  Normalized to a fixed 8h axis (the Hyperliquid/Binance convention) from the
     *  chain's per-calculation-window value, so it stays comparable across a parameter
     *  change. NOT the amount charged at each settlement: that is this divided by
     *  `n = fundingWindowSec / fundingIntervalSec`, which is 8 on every live pool and has
     *  been 96 at a 300s cadence. `info` carries both figures.
     *
     *  On a HISTORICAL row that caught up over several intervals, `rate / n` is only ONE
     *  interval's worth: the amount that settlement actually charged is
     *  `rate * intervalsAccrued / n`. Rows at the deployed one-interval horizon have
     *  `intervalsAccrued` of 1, so the two agree there and disagree only on older
     *  catch-up rows.
     */
    fundingRate: number;
    /**
     *  When funding next settles, or when this row settled (ms).
     *
     *  For a live read this is the last settlement anchor plus the settlement interval;
     *  because settlement is permissionless and LAZY it can be in the past, which means a
     *  settlement is due rather than that anything is wrong.
     */
    fundingTimestamp?: number;
    /** When this snapshot was read (ms, local clock). */
    timestamp: number;
    /** ISO-8601 of `timestamp`. */
    datetime: string;
    /** The native on-chain perp state (raw 1e18/quote-unit bigints). */
    info: unknown;
}
/**
 * An open perp position, human units.
 *
 * @category models
 */
export interface UnifiedPosition {
    /** The perp's tradable symbol. */
    symbol: string;
    /** Numeric chain id the market lives on. */
    chainId: number;
    /** Position direction (from the sign of the on-chain size). */
    side: "long" | "short";
    /** Absolute position size in base units. */
    contracts: number;
    /** Average entry price, human quote units. */
    entryPrice: number;
    /** Current EMA mark price, human quote units. Absent when `perpState` is `"degraded"`. */
    markPrice?: number;
    /**
     *  (mark − entry) × signed size, human quote units. Excludes pending funding.
     *  Absent when `perpState` is `"degraded"`.
     */
    unrealizedPnl?: number;
    /**
     *  Estimated liquidation price, human quote units — the price at which THIS market's
     *  move alone would trip the account's cross-margin maintenance requirement.
     *  `undefined` when it can't be derived (a stale mark anywhere in the account reverts
     *  the health read this needs).
     *
     *  Solved with both sides of `equity == mmReq` moving against the mark; see
     *  `perpLiquidationPrice` for the identity and what is held constant. For the price a
     *  proposed order would move this to, use `client.previewPerpLiquidationPrice`.
     */
    liquidationPrice?: number;
    /** When the position last changed on-chain (ms). */
    timestamp?: number;
    /** ISO-8601 of `timestamp`. */
    datetime?: string;
    /**
     *  Whether the pool state behind `markPrice` and `unrealizedPnl` was read.
     *
     *  The same flag as {@link UnifiedTicker.perpState}, without
     *  `"not-applicable"`, because a position is always a perp.
     *
     *  - `"ok"` — the pool state was read. `markPrice` and `unrealizedPnl` are present.
     *  - `"degraded"` — the pool state read failed, for example because the pool's
     *    oracle reverts. The position is real; only `markPrice` and `unrealizedPnl`
     *    are absent. The other positions in the same read are not affected.
     */
    perpState: "ok" | "degraded";
    /**
     *  The native reads: `{ position, state, markFromIndex }` (raw bigints), or
     *  `{ position }` alone when `perpState` is `"degraded"`.
     */
    info: unknown;
}
/**
 * A realtime price snapshot for one asset (the on-chain EMA oracle feed).
 *
 * @category models
 */
export interface UnifiedPrice {
    /** Asset symbol, e.g. "BTC", "ETH". */
    symbol: string;
    /** Latest price, human units. */
    price: number;
    /** Latest EMA (exponential moving average) price, human units. */
    ema: number;
    /** Block timestamp of the latest observation (ms). */
    timestamp: number;
    /** ISO-8601 of `timestamp`. */
    datetime: string;
    /** The native {@link LivePrice} row (raw 1e18 strings + block metadata). */
    info: unknown;
}
/**
 * Timeframe string → seconds, matching the indexer's candle intervals.
 *
 * @category models
 */
export declare const TIMEFRAMES: Record<string, number>;
/**
 *  Human number → raw integer units: the value the caller typed, scaled to
 *  `decimals`. A number carrying more fraction digits than `decimals` is rounded
 *  to scale — same contract as {@link Units.fromHuman}, which does the work.
 *
 *  Rounding to scale can land ABOVE the caller's number, so a quantity that must
 *  not exceed a balance wants {@link snapToGrid}'s `strict` option, which
 *  truncates instead.
 */
export declare function toRaw(x: number, decimals: number): bigint;
/** How {@link snapToGrid} treats a value that is a hair below a grid point. */
export interface SnapToGridOptions {
    /**
     *  Which way an off-grid value moves. `"down"` (the default) is right for a
     *  quantity, and for a price the caller must not exceed — a buy limit. `"up"`
     *  is right for a price the caller must not fall below: a sell limit, or a
     *  protective limit that has to stay crossing the level it was priced against.
     *  Rounding the wrong way is a real loss, not a formatting choice, so the
     *  direction belongs to the VALUE rather than to the market. `"up"` cannot be
     *  combined with `strict`, whose contract requires the result not to exceed
     *  the input.
     */
    direction?: "down" | "up";
    /**
     *  Bound the result inside `[step, one − step]`. For binary probability
     *  prices, which may not rest at 0 or 1.
     */
    clamp?: boolean;
    /**
     *  Never return more than `x`. Set it for a quantity bounded by something the
     *  caller cannot exceed — a wallet balance, a budget — where being a hair over
     *  is an on-chain revert. Clear (the default) for a price, where losing a whole
     *  tick to float noise is the worse failure. See Gotchas.
     */
    strict?: boolean;
}
/**
 *  Human number → raw integer units, TRUNCATING anything past `decimals` rather
 *  than rounding it.
 *
 *  {@link toRaw} rounds to scale (half away from zero), so an over-precise number
 *  becomes a raw value ABOVE it: `toRaw(0.1234567, 6)` is `123457`, i.e. 0.123457.
 *  Flooring onto a grid afterwards then starts from an inflated value and can land
 *  above the caller's own number — which is the revert `strict` exists to prevent.
 *  Every quantity the write path floors onto a lot grid converts through this,
 *  never through {@link toRaw}, for the same reason.
 */
export declare function floorToRaw(x: number, decimals: number): bigint;
/**
 *  Snap a human number onto a raw-units grid (tick or lot), returning the aligned
 *  human number. Rounds DOWN unless `direction: "up"` is passed.
 *
 *  The alignment happens entirely in bigint space, which is the only space the
 *  answer exists in: the grid is defined in raw integer units, and a float
 *  cannot hold most of its multiples at 18 decimals. Doing it as
 *  `Math.floor(x / tick) * tick` and re-printing with `toFixed` reintroduces the
 *  binary expansion that {@link Units.humanToDecimalString} exists to avoid, and
 *  produced off-tick values 16 times out of 19 on the live venue's ladder.
 *
 *  **Gotchas**
 *
 *  By default a value a hair BELOW a grid point is treated as sitting ON it,
 *  rather than snapped down a whole step. Callers arrive here with computed
 *  prices — a book mid like `(0.001 + 0.009) / 2` is `0.004999999999999999`, and
 *  flooring that to `0.004` would quote a full tick away from what the caller
 *  asked for, silently. The tolerance is one part in `2 ** 52` of the value,
 *  the double's own resolution.
 *
 *  That rounding is right for a price and WRONG for a quantity bounded above.
 *  The tolerance is relative, so it grows with magnitude, and a balance one wei
 *  under a lot boundary would be nudged past it — the "insufficient balance"
 *  revert {@link Units.balanceFloor} exists to prevent. Pass `strict` for those
 *  callers; the result is then never greater than `x`.
 */
export declare function snapToGrid(x: number, stepRaw: bigint, decimals: number, options?: SnapToGridOptions): number;
/**
 *  Raw integer units → human number (display/strategy precision).
 *
 *  Scales via the exact decimal string rather than `Number(raw) / 10 ** decimals`.
 *  The division is a float operation, so it could land a few wei off the value it
 *  was given: `19000000000000000000000` came back as `19000.000000000004`, which
 *  is no longer on a 1e15 grid. That silently un-aligned every quantized price
 *  {@link snapToGrid} had just aligned in bigint space, for about a quarter of
 *  ordinary prices above ~1000. The result is still a double, so it is still
 *  display-grade past ~15 significant digits — but it is now the closest double
 *  to the true value instead of the closest double to a lossy quotient.
 *
 *  A string argument must be a raw INTEGER string, which is what every caller
 *  passes: the indexer types all of these fields as `BigInt`, so they arrive as
 *  stringified integers. A decimal or exponent string ("1.5", "1e5") now throws
 *  from `BigInt()` where the old division silently returned a rescaled number —
 *  it was never a valid raw value, and failing loudly beats scaling it twice.
 */
export declare function toHumanNum(raw: string | bigint | null | undefined, decimals: number): number;
export declare function toDatetime(tsMs: number): string;
/** Map the native order lifecycle onto the unified status vocabulary. */
export declare function toUnifiedStatus(status: string): UnifiedOrderStatus;
/**
 *  Decimal places implied by a raw step size (tick/lot) at `decimals` scale —
 *  e.g. tick 1000 at 6dp → 3 price decimals.
 */
export declare function precisionFromStep(step: string | null | undefined, decimals: number): number;
/** Validate existing wire number/string boundaries before exposing an exact block. */
export declare function tradeBlockNumber(value: string | number | undefined, logIndex: number | undefined): bigint | undefined;
