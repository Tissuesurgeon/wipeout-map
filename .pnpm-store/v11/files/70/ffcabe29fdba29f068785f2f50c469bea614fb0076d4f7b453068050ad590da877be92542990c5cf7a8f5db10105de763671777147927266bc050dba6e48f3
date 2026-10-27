// Adds the two stop fields a stop row does not carry: its venue and its limit price.
//
// Neither value is part of the guarded snapshot. The venue comes from the indexer's
// market row for the stop's pool. The limit price comes from the perp stop registry
// at the chain head, because no event carries it. So each value has its own status,
// and a read that fails leaves the value `unknown` with the error, never a guess.
//
// The work is bounded. Every read shares one deadline, and a read that misses it
// leaves its values `unknown` with the reason `readFailed`. The read itself goes on in
// the background until its own transport timeout; its answer is dropped.

import { isAddress } from "viem";
import { ContractRevertError, IndexerError, NotConfiguredError, RpcError } from "../errors.js";
import type * as IndexerRead from "../indexerRead.js";
import type * as Markets from "../markets.js";
import type { PerpStopOrderRead, PerpStopOrderRef } from "../perp/stops.js";
import * as Raise from "../raise.js";
import { deepFreeze } from "./freeze.js";
import type { AccountStopTerms } from "./rows.js";
import type { AccountStop, AccountStopLimitPrice, AccountStopVenue } from "./types.js";

/** How long one enrichment waits for all of its reads. */
export const ENRICHMENT_DEADLINE_MS = 5_000;

/** The most limit prices one engine keeps. An account holds at most its stop capacity. */
const LIMIT_PRICE_CACHE_MAX = 4_096;

/**
 *  Limit prices already read, by `<dataset generation>:<stop id>`.
 *
 *  A stop's terms never change while it is live, so a price read once stays true.
 *  Only a successful read is kept.
 */
export class LimitPriceCache {
  readonly #prices = new Map<string, bigint>();

  /** `max` is the most prices kept; the one read longest ago goes first. */
  constructor(readonly max = LIMIT_PRICE_CACHE_MAX) {}

  get(key: string): bigint | undefined {
    const price = this.#prices.get(key);
    if (price === undefined) return undefined;
    // Move it to the back, so the entries evicted first are the ones read longest ago.
    this.#prices.delete(key);
    this.#prices.set(key, price);
    return price;
  }

  set(key: string, price: bigint): void {
    this.#prices.delete(key);
    this.#prices.set(key, price);
    // Maps keep insertion order, so the first key is the oldest.
    for (const oldest of this.#prices.keys()) {
      if (this.#prices.size <= this.max) break;
      this.#prices.delete(oldest);
    }
  }
}

export interface EnrichmentDeps {
  /** The request context of the snapshot the stops came from. */
  readonly context: IndexerRead.RequestContext;
  /**
   *  Each pool's market type, in the order asked, or `null` for a pool the indexer has
   *  no market for. `pools` are lower-case and distinct.
   */
  readonly poolTypes: (
    pools: readonly string[],
    source: IndexerRead.Source,
  ) => Promise<readonly (Markets.MarketType | null)[]>;
  /** Reads perp stops from the registry. Rejects with {@link NotConfiguredError} when there is no chain transport. */
  readonly readPerpStops: (refs: readonly PerpStopOrderRef[]) => Promise<readonly PerpStopOrderRead[]>;
  readonly limitPrices: LimitPriceCache;
  readonly deadlineMs: number;
}

type Outcome<T> = { status: "done"; value: T } | { status: "failed"; error: unknown } | { status: "late" };

/**
 *  Waits for `promise` until `deadline` fires. Rejects with the signal's reason when
 *  `signal` aborts, so a stopped read never waits for the deadline.
 *
 *  The read's own outcome is always observed, even after the caller stopped waiting.
 *  A read that fails later must not become an unhandled rejection.
 */
function within<T>(promise: Promise<T>, deadline: Promise<void>, signal: AbortSignal): Promise<Outcome<T>> {
  return new Promise<Outcome<T>>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    const settle = (outcome: Outcome<T>) => {
      signal.removeEventListener("abort", onAbort);
      resolve(outcome);
    };
    promise.then(
      (value) => settle({ status: "done", value }),
      (error: unknown) => settle({ status: "failed", error }),
    );
    void deadline.then(() => settle({ status: "late" }));
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function venueOfType(type: Markets.MarketType | null): AccountStopVenue {
  if (type === "SPOT") return { status: "known", venue: "spot" };
  if (type === "PERP") return { status: "known", venue: "perp" };
  // No market row, or a binary one: no stop registry serves a binary pool.
  return { status: "unknown", reason: "unlistedMarket", error: null };
}

/** The venue of every pool in `pools`, from one batched pool-type read. */
function venuesOf(
  outcome: Outcome<readonly (Markets.MarketType | null)[]>,
  pools: readonly string[],
  deadlineMs: number,
): readonly AccountStopVenue[] {
  const all = (venue: AccountStopVenue) => pools.map(() => venue);
  switch (outcome.status) {
    case "done":
      if (outcome.value.length !== pools.length) Raise.unreachable("poolMarketTypes returns one type per pool");
      return outcome.value.map(venueOfType);
    case "failed": {
      // A reply the mapping could not read fails as a plain JavaScript error. It is still
      // a failed read of the indexer, never an error outside the published ones.
      const error =
        outcome.error instanceof IndexerError
          ? outcome.error
          : new IndexerError("PoolTypes", "the indexer's market types could not be read", { cause: outcome.error });
      return all({ status: "unknown", reason: "readFailed", error });
    }
    case "late":
      return all({
        status: "unknown",
        reason: "readFailed",
        error: new IndexerError("PoolTypes", `no answer within ${deadlineMs} ms`),
      });
  }
}

/** The limit price of every perp LIMIT stop in `reads`, from one registry read. */
function limitPricesOf(
  outcome: Outcome<readonly PerpStopOrderRead[]>,
  count: number,
  deadlineMs: number,
): readonly AccountStopLimitPrice[] {
  const all = (price: AccountStopLimitPrice) => Array.from({ length: count }, () => price);
  switch (outcome.status) {
    case "done":
      if (outcome.value.length !== count) Raise.unreachable("getPerpStopOrders returns one result per ref");
      return outcome.value.map((read): AccountStopLimitPrice => {
        if (read.status === "present") return { status: "known", value: read.order.limitPrice };
        if (read.status === "absent") return { status: "unknown", reason: "notLive", error: null };
        return { status: "unknown", reason: "readFailed", error: read.error };
      });
    case "failed": {
      const { error } = outcome;
      if (error instanceof NotConfiguredError) return all({ status: "unknown", reason: "chainUnavailable", error });
      // An answer the decoding could not read is still a failed registry read.
      const readError =
        error instanceof RpcError || error instanceof ContractRevertError
          ? error
          : new RpcError("getPerpStopOrders", "the stop registry's answer could not be read", { cause: error });
      return all({ status: "unknown", reason: "readFailed", error: readError });
    }
    case "late":
      return all({
        status: "unknown",
        reason: "readFailed",
        error: new RpcError("getPerpStopOrders", `no answer within ${deadlineMs} ms`),
      });
  }
}

/**
 *  Adds the venue and the limit price to every stop.
 *
 *  `generation` keys the limit-price cache. `signal` stops the enrichment; it then
 *  rejects with the signal's reason.
 */
export async function enrichStops(
  stops: readonly AccountStopTerms[],
  generation: string,
  deps: EnrichmentDeps,
  signal: AbortSignal,
): Promise<readonly AccountStop[]> {
  if (stops.length === 0) return [];
  // A stopped read starts nothing: after `stopLive()`, a new chain read would open a new socket.
  if (signal.aborted) throw signal.reason;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, deps.deadlineMs);
  });
  try {
    const pools = [...new Set(stops.map((stop) => stop.pool))];
    const types = await within(deps.poolTypes(pools, deps.context), deadline, signal);
    const poolVenues = venuesOf(types, pools, deps.deadlineMs);
    const venues = new Map(
      pools.map((pool, index) => [pool, poolVenues[index] ?? Raise.unreachable("one venue per pool")]),
    );
    const venueFor = (stop: AccountStopTerms) =>
      venues.get(stop.pool) ?? Raise.unreachable(`stop ${stop.id} has a pool whose venue was not read`);

    const cacheKey = (stop: AccountStopTerms) => `${generation}:${stop.id}`;
    // Cached prices are taken now: the read below adds prices, and adding can evict.
    const read = new Map<string, AccountStopLimitPrice>();
    const toRead = stops.filter((stop) => {
      const venue = venueFor(stop);
      if (stop.orderType !== 0 || venue.status !== "known" || venue.venue !== "perp") return false;
      const cached = deps.limitPrices.get(cacheKey(stop));
      if (cached === undefined) return true;
      read.set(stop.id, { status: "known", value: cached });
      return false;
    });
    if (toRead.length > 0) {
      const refs = toRead.map((stop): PerpStopOrderRef => {
        const registry = stop.registry;
        if (!isAddress(registry, { strict: false })) {
          return Raise.unreachable(`stop ${stop.id} has a registry the snapshot did not check`);
        }
        return { registry, orderId: stop.orderIdRaw };
      });
      // The signal can abort between the two steps. Check again before the chain read starts.
      if (signal.aborted) throw signal.reason;
      const outcome = await within(deps.readPerpStops(refs), deadline, signal);
      const prices = limitPricesOf(outcome, toRead.length, deps.deadlineMs);
      toRead.forEach((stop, index) => {
        const price = prices[index] ?? Raise.unreachable("one limit price per stop read");
        if (price.status === "known") deps.limitPrices.set(cacheKey(stop), price.value);
        read.set(stop.id, price);
      });
    }

    return stops.map((stop): AccountStop => {
      const venue = venueFor(stop);
      return deepFreeze({ ...stop, venue, limitPrice: limitPriceOf(stop, venue, read) });
    });
  } finally {
    clearTimeout(timer);
  }
}

/** The limit price of one stop. `read` holds a price for every perp LIMIT stop, read or cached. */
function limitPriceOf(
  stop: AccountStopTerms,
  venue: AccountStopVenue,
  read: ReadonlyMap<string, AccountStopLimitPrice>,
): AccountStopLimitPrice {
  // A MARKET stop places a market order, which has no limit price on any venue.
  if (stop.orderType === 1) return { status: "notApplicable" };
  // A price read waits for the venue, so a venue still being read leaves the price pending too.
  if (venue.status === "pending") return { status: "pending" };
  if (venue.status === "unknown") return { status: "unknown", reason: "venueUnknown", error: null };
  if (venue.venue === "spot") return { status: "unknown", reason: "spotUnreadable", error: null };
  return (
    read.get(stop.id) ?? Raise.unreachable(`perp LIMIT stop ${stop.id} has neither a read nor a cached limit price`)
  );
}
