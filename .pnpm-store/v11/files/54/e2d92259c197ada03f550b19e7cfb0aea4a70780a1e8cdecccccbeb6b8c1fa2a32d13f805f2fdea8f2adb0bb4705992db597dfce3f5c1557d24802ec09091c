// Engine config, carried by the exchange (`new SomniaMarkets(config)` passes it
// through). There is no module-global config; each exchange owns its own.
// snapshot.ts / liveTail.ts / reads etc. receive what they need from the
// client, not from here.
import { InvalidInputError, NotConfiguredError } from "./errors.js";
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
export const SOMNIA_TESTNET_PRICE_FEED = {
    url: "https://price-feed.dev.oracle.somnia.host/v1/graphql",
    quote: "USDC",
};
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
export const SOMNIA_MAINNET_PRICE_FEED = {
    url: "https://price-feed.prd.oracle.somnia.host/v1/graphql",
    quote: "USDC",
};
/**
 *  SDK default for {@link ClientConfig.fees}: 60 gwei ceiling (~10× the observed
 *  Somnia base fee of 6 gwei), zero tip — instant BFT inclusion needs no bribe.
 *
 * @category configuration
 */
export const DEFAULT_FEES = {
    maxFeePerGas: 60000000000n,
    maxPriorityFeePerGas: 0n,
};
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
export const DEFAULT_GAS = 10000000n;
/**
 *  Conservative defaults for {@link ClientConfig.indexerLimits}: no boundary
 *  retry, a per-page-sized cap, and five endpoint failures before the breaker opens.
 *
 * @category configuration
 */
export const DEFAULT_INDEXER_LIMITS = Object.freeze({
    maxInFlight: 12,
    breakerThreshold: 5,
    breakerCooldownMs: 30_000,
    baseDelayMs: 500,
    maxDelayMs: 30_000,
    maxAttempts: 1,
    maxQueued: 100,
});
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
export function nextBackoffDelayMs(attempt, random, limits = {}) {
    // A NaN or negative input yields a NaN or negative delay, which every timer
    // treats as "fire now" — the retry storm this schedule exists to prevent.
    if (!Number.isFinite(attempt) || attempt < 0) {
        throw new InvalidInputError(`nextBackoffDelayMs: attempt must be a finite number >= 0, got ${attempt}`);
    }
    if (!(random >= 0 && random < 1)) {
        throw new InvalidInputError(`nextBackoffDelayMs: random must be in [0, 1), got ${random}`);
    }
    const base = positiveDelay(limits.baseDelayMs, DEFAULT_INDEXER_LIMITS.baseDelayMs, "baseDelayMs");
    const max = positiveDelay(limits.maxDelayMs, DEFAULT_INDEXER_LIMITS.maxDelayMs, "maxDelayMs");
    // 2 ** attempt overflows to Infinity; Math.min pins it.
    const ceiling = Math.min(max, base * 2 ** attempt);
    return random * ceiling;
}
/**
 *  A delay bound must be finite and POSITIVE. Zero is rejected along with the
 *  negatives: `baseDelayMs: 0` or `maxDelayMs: 0` pins every draw at zero, so
 *  a raised `maxAttempts` retries back to back — the storm this paces away.
 */
export function positiveDelay(value, fallback, field) {
    if (value === undefined)
        return fallback;
    if (!Number.isFinite(value) || value <= 0) {
        throw new InvalidInputError(`indexerLimits.${field} must be a finite number > 0, got ${value}`);
    }
    return value;
}
/**
 *  The indexer WebSocket endpoint of a client: `indexerWsUrl` when set, or the WebSocket
 *  twin of an absolute `http(s)://` `indexerUrl`. `undefined` when neither gives one.
 */
export function resolveIndexerWsUrl(config) {
    if (config.indexerWsUrl !== undefined && config.indexerWsUrl !== "")
        return config.indexerWsUrl;
    const url = config.indexerUrl;
    if (url === undefined || !/^https?:\/\//i.test(url))
        return undefined;
    return url.replace(/^http(s?):\/\//i, "ws$1://");
}
/**
 *  Resolve the price-feed endpoint from config, filling in the WS URL from the
 *  HTTP one (http→ws, https→wss) when unset. Throws a clear error if no endpoint
 *  is configured.
 */
export function resolvePriceFeed(config) {
    const feed = config.priceFeed;
    if (!feed) {
        throw new NotConfiguredError("config.priceFeed = { url } — the price-feed indexer's GraphQL endpoint", "this price-feed read");
    }
    return {
        url: feed.url,
        wsUrl: feed.wsUrl ?? feed.url.replace(/^https?/i, (m) => (m.length === 5 ? "wss" : "ws")),
        // Uppercased to match the feed's canonical quote casing; undefined ⇒ no filter.
        quote: feed.quote ? feed.quote.toUpperCase() : undefined,
    };
}
