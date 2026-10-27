// A live orders view whose stops follow the chain.
//
// The indexer's session (`session.ts`) keeps the view complete at the indexer's version,
// which trails the chain by the indexer's lag and Hasura's 5 s push. This session wraps
// it and follows every stop registry's events over the chain socket, so a stop the
// account creates, links, unlinks or cancels, or that fires, shows within a block or so.
// It keeps those changes in an overlay (`stopOverlay.ts`) on the indexer's stops until
// the indexer's version reaches them. Open orders stay the indexer's: they are live from
// the chain in `accountSpotOrders` and `accountPositions`.
//
// The registries' events are few, so the subscription takes all of them and this session
// keeps the account's own: the creation, a pair's link and the sweep of an inert stop
// name the owner; the rest name a stop the view already holds. Each subscription that
// opens reads the registries' logs since the indexer's processed height, so the overlay
// also holds what changed while no subscription did: before the first one opened, and
// while one was down. The live logs wait while that read is in flight and are applied
// after what it found, so a stop created in that gap is known before a live log names it.
// A read that fails is made again after a backoff while the subscription stays open.
//
// Every state of the indexer's session passes through. Only a `ready` or `stale` view
// carries stops, and only one with chain changes ahead of its version is rebuilt.

import type { Address, Hex } from "viem";
import { NotConfiguredError } from "../errors.js";
import * as Markets from "../markets.js";
import { deepFreeze } from "./freeze.js";
import type { LiveSession } from "./registry.js";
import * as Rows from "./rows.js";
import * as StopEvents from "./stopEvents.js";
import { StopOverlay, type LogPosition, type StopValues } from "./stopOverlay.js";
import type { AccountOrdersData, AccountOrdersView, AccountStop } from "./types.js";
import * as Wire from "./wireSchemas.js";

/** How often the stop registries are listed again, so a new market's registry is followed. */
export const REGISTRIES_REFRESH_MS = 60_000;

/** The most blocks the log read after a subscription opens goes back. Somnia's nodes refuse a wider range. */
export const MAX_BACKFILL_BLOCKS = 1_000n;

/** How many block times are kept, newest last. */
const BLOCK_TIMES_KEPT = 256;

const PENDING: StopValues = Object.freeze({
  venue: Object.freeze({ status: "pending" }),
  limitPrice: Object.freeze({ status: "pending" }),
});

/** A stop registry the indexer's market list names. Addresses are lower-case. */
export interface StopRegistry {
  readonly address: Address;
  /** The pool its stops place into: the market id of their rows. */
  readonly pool: Address;
  readonly venue: "perp" | "spot";
}

/** The stop registries of `markets`: those of the spot and perp markets that have one, lower-cased. */
export function registriesOf(markets: readonly Markets.Market[]): StopRegistry[] {
  const registries = new Map<string, StopRegistry>();
  for (const market of markets) {
    if (market.marketType === "BINARY" || market.stopRegistry === null) continue;
    const address = Markets.lower0x(market.stopRegistry);
    registries.set(address, {
      address,
      pool: Markets.lower0x(market.poolAddress),
      venue: market.marketType === "PERP" ? "perp" : "spot",
    });
  }
  return [...registries.values()];
}

/** One log a subscription or a log read delivered. The address is lower-case. */
export interface RegistryLog {
  readonly address: string;
  readonly topics: readonly Hex[];
  readonly data: Hex;
  readonly blockNumber: bigint | null;
  readonly logIndex: number | null;
  readonly transactionHash: Hex | null;
}

/** One `logs` filter: the registries, and the topics position by position. */
export interface RegistryLogFilter {
  readonly address: Address[];
  readonly topics: (Hex | Hex[] | null)[];
}

export interface ChainStopsDeps {
  /** The account, lower-cased. */
  readonly account: string;
  /** Builds the indexer's session of the account. It publishes through `publish`. */
  readonly indexer: (publish: (view: AccountOrdersView) => void) => LiveSession<AccountOrdersView>;
  /** The stop registries of the spot and perp markets. Rejects with the indexer's error. */
  readonly registries: (signal: AbortSignal) => Promise<readonly StopRegistry[]>;
  /**
   *  Subscribes to the logs `filters` match, and returns the release. `onLog` gets
   *  `undefined` for a log that does not read. `onError` fires at most once, when the
   *  subscription is lost, and `onOpen` once, when the node confirms it. None of them
   *  fires during the call. Throws when the client has no chain transport.
   */
  readonly watch: (
    filters: readonly RegistryLogFilter[],
    onLog: (log: RegistryLog | undefined) => void,
    onError: () => void,
    onOpen: () => void,
  ) => () => void;
  /** The logs `filters` match from `fromBlock` to `toBlock`, both included. */
  readonly logs: (
    filters: readonly RegistryLogFilter[],
    fromBlock: bigint,
    toBlock: bigint,
    signal: AbortSignal,
  ) => Promise<readonly (RegistryLog | undefined)[]>;
  /** The chain head. */
  readonly head: (signal: AbortSignal) => Promise<bigint>;
  /** A block's time, in Unix seconds. */
  readonly blockTime: (blockNumber: bigint, signal: AbortSignal) => Promise<bigint>;
  /** Adds the venue and the limit price to stops, as the indexer's session does. Rejects only when `signal` aborts. */
  readonly enrich: (
    stops: readonly Rows.AccountStopTerms[],
    generation: string,
    signal: AbortSignal,
  ) => Promise<readonly AccountStop[]>;
  readonly publish: (view: AccountOrdersView) => void;
  readonly nextRevision: () => number;
  readonly nowMs: () => number;
  /** The delay before retry `attempt`, counting from 0. */
  readonly backoffMs: (attempt: number) => number;
  readonly warn: (message: string, data?: Record<string, unknown>) => void;
}

/** A pending stop's row id: `<registry>_<orderId>`. */
function stopIdOf(registry: string, orderId: bigint): string {
  return `${registry}_${orderId}`;
}

function isPending(stop: AccountStop): boolean {
  return stop.venue.status === "pending" || stop.limitPrice.status === "pending";
}

/** The view's data, when it carries any. */
function dataOf(view: AccountOrdersView | undefined): AccountOrdersData | undefined {
  return view?.status === "ready" || view?.status === "stale" ? view.data : undefined;
}

export class ChainStopsSession implements LiveSession<AccountOrdersView> {
  readonly #deps: ChainStopsDeps;
  /** Aborts the session's chain reads when it closes. */
  readonly #controller = new AbortController();
  readonly #overlay = new StopOverlay();
  #indexer: LiveSession<AccountOrdersView> | undefined;
  #closed = false;
  /** The indexer session's last view. */
  #base: AccountOrdersView | undefined;
  /** The ids of the stops in the indexer session's last view. */
  #baseIds = new Set<string>();
  #view: AccountOrdersView | undefined;
  #registries = new Map<string, StopRegistry>();
  #registriesKey = "";
  /** The open subscription's token; a callback of an older one is ignored. */
  #watch: object | undefined;
  #unwatch: (() => void) | undefined;
  #watchFailures = 0;
  #watchTimer: ReturnType<typeof setTimeout> | undefined;
  #registriesTimer: ReturnType<typeof setTimeout> | undefined;
  /** Set when the client has no chain transport: the stops follow the indexer for good. */
  #chainless = false;
  /** Whether the open subscription still has to read what changed before it opened. */
  #backfillDue = false;
  /** Whether that read is in flight. The live logs wait for it in the queue. */
  #backfilling = false;
  /** Consecutive failed reads of the open subscription, for the backoff. */
  #backfillFailures = 0;
  #backfillTimer: ReturnType<typeof setTimeout> | undefined;
  /** Logs waiting to be applied, in order. */
  readonly #queue: (RegistryLog | undefined)[] = [];
  #draining = false;
  readonly #times = new Map<bigint, bigint>();
  /** The venue and limit price read for stops created on chain. */
  readonly #values = new Map<string, StopValues>();
  readonly #valuesReading = new Set<string>();

  constructor(deps: ChainStopsDeps) {
    this.#deps = deps;
  }

  /** The last view the session published, if any. */
  get view(): AccountOrdersView | undefined {
    return this.#view;
  }

  start(): void {
    this.#indexer = this.#deps.indexer((view) => this.#onIndexer(view));
    this.#indexer.start();
    void this.#listRegistries();
  }

  /** Stops for good. `publishClosed` has the indexer's session send a last `closed` view. */
  close(publishClosed: boolean): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#controller.abort();
    this.#unwatch?.();
    this.#unwatch = undefined;
    this.#watch = undefined;
    clearTimeout(this.#watchTimer);
    clearTimeout(this.#registriesTimer);
    clearTimeout(this.#backfillTimer);
    this.#watchTimer = undefined;
    this.#registriesTimer = undefined;
    this.#backfillTimer = undefined;
    this.#indexer?.close(publishClosed);
  }

  // ---------------------------------------------------------------- the indexer's view

  #onIndexer(view: AccountOrdersView): void {
    if (view.status === "closed") {
      this.#publish(view);
      return;
    }
    if (this.#closed) return;
    this.#base = view;
    const data = dataOf(view);
    if (data !== undefined) {
      this.#baseIds = new Set(data.stops.map((stop) => stop.id));
      this.#overlay.prune(data.version.blockNumber);
      this.#forgetValues(data);
      this.#readValues();
      // A read that failed waits for its backoff.
      if (this.#backfillDue && this.#backfillTimer === undefined) void this.#backfill();
    }
    this.#emit();
  }

  /** Publishes the indexer's view with the chain's stop changes on top. */
  #emit(): void {
    const base = this.#base;
    if (base === undefined || this.#closed) return;
    const data = dataOf(base);
    if (base.status === "closed" || data === undefined) {
      this.#publish(base);
      return;
    }
    // A stop the indexer's session still reads keeps the values this session read for it.
    const carried = data.stops.map((stop) => {
      const values = isPending(stop) ? this.#values.get(stop.id) : undefined;
      return values === undefined ? stop : Object.freeze({ ...stop, ...values });
    });
    if (this.#overlay.isEmpty() && carried.every((stop, index) => stop === data.stops[index])) {
      this.#publish(base);
      return;
    }
    const merged: AccountOrdersData = deepFreeze({
      ...data,
      stops: this.#overlay.merge(carried, (id) => this.#values.get(id) ?? PENDING),
      sync: { ...data.sync, chainStopsBlock: this.#overlay.latestBlock() },
      observedAtMs: this.#deps.nowMs(),
    });
    this.#publish(Object.freeze({ ...base, revision: this.#deps.nextRevision(), data: merged }));
  }

  #publish(view: AccountOrdersView): void {
    // The indexer's view, passed through once.
    if (view === this.#view) return;
    this.#view = view;
    this.#deps.publish(view);
  }

  // ---------------------------------------------------------------- the registries

  async #listRegistries(): Promise<void> {
    try {
      const listed = await this.#deps.registries(this.#controller.signal);
      if (this.#closed) return;
      this.#follow(listed);
    } catch (error) {
      if (this.#closed) return;
      this.#deps.warn("the stop registries could not be listed; stops follow the indexer for now", { error });
    }
    if (this.#chainless) return;
    this.#registriesTimer = setTimeout(() => {
      this.#registriesTimer = undefined;
      void this.#listRegistries();
    }, REGISTRIES_REFRESH_MS);
  }

  /** Follows `listed`, or keeps the subscription that already follows them. */
  #follow(listed: readonly StopRegistry[]): void {
    this.#registries = new Map(listed.map((registry) => [registry.address, registry]));
    const key = [...this.#registries.keys()].sort().join(",");
    const changed = key !== this.#registriesKey;
    this.#registriesKey = key;
    // A lost subscription opens again after its backoff, with these registries.
    if (this.#watchTimer !== undefined) return;
    if (this.#watch !== undefined && !changed) return;
    this.#openWatch();
  }

  #filters(): RegistryLogFilter[] | undefined {
    if (this.#registries.size === 0) return undefined;
    return [
      {
        address: [...this.#registries.values()].map((registry) => registry.address),
        topics: [[...StopEvents.STOP_EVENT_TOPICS]],
      },
    ];
  }

  #openWatch(): void {
    this.#unwatch?.();
    this.#unwatch = undefined;
    this.#watch = undefined;
    // A new subscription reads what it missed once the node confirms it.
    this.#cancelBackfill();
    const filters = this.#filters();
    if (this.#closed || filters === undefined) return;
    const token = {};
    try {
      this.#unwatch = this.#deps.watch(
        filters,
        (log) => this.#onLog(log),
        () => this.#watchLost(token),
        () => this.#watchOpened(token),
      );
      this.#watch = token;
    } catch (error) {
      this.#deps.warn("the stop registries' events could not be followed; stops follow the indexer", { error });
      // A client with no chain transport never gets one, so the registries are not listed again.
      if (error instanceof NotConfiguredError) this.#chainless = true;
    }
  }

  #watchOpened(token: object): void {
    if (this.#closed || token !== this.#watch) return;
    // What changed before this moment reached no subscription.
    this.#backfillDue = true;
    this.#backfillFailures = 0;
    void this.#backfill();
  }

  #watchLost(token: object): void {
    if (this.#closed || token !== this.#watch) return;
    this.#unwatch?.();
    this.#unwatch = undefined;
    this.#watch = undefined;
    this.#cancelBackfill();
    this.#deps.warn("the stop registries' event subscription was lost; stops follow the indexer until it opens again", {
      account: this.#deps.account,
    });
    const delay = this.#deps.backoffMs(this.#watchFailures);
    this.#watchFailures += 1;
    clearTimeout(this.#watchTimer);
    this.#watchTimer = setTimeout(() => {
      this.#watchTimer = undefined;
      this.#openWatch();
    }, delay);
  }

  /** A log is a chain fact, whichever subscription brings it, so a replaced one's late log counts too. */
  #onLog(log: RegistryLog | undefined): void {
    if (this.#closed) return;
    this.#watchFailures = 0;
    this.#queue.push(log);
    void this.#drain();
  }

  /**
   *  Reads the registries' logs since the indexer's processed height, once the subscription
   *  is open and the view says that height. What it finds goes ahead of the live logs that
   *  waited for it. A failed read is made again after a backoff while the subscription
   *  stays open.
   */
  async #backfill(): Promise<void> {
    const data = dataOf(this.#base);
    if (!this.#backfillDue || this.#backfilling || data === undefined || this.#closed) return;
    const filters = this.#filters();
    if (filters === undefined) return;
    const watch = this.#watch;
    this.#backfilling = true;
    let found: readonly (RegistryLog | undefined)[] | undefined;
    try {
      found = await this.#logsSince(filters, data.sync.processedHeight);
    } catch (error) {
      // The first failure says it; the reads made again after it stay quiet.
      if (!this.#closed && this.#backfillFailures === 0) {
        this.#deps.warn("the stop registries' recent logs could not be read; they are read again after a backoff", {
          error,
        });
      }
    } finally {
      this.#backfilling = false;
    }
    if (this.#closed) return;
    if (found !== undefined) {
      // A stop's creation comes before the live logs that name it.
      this.#queue.unshift(...found);
      // A subscription that opened while this read was in flight reads its own gap next.
      if (watch === this.#watch) this.#backfillDue = false;
    }
    void this.#drain();
    if (!this.#backfillDue) return;
    // The open subscription's own read follows at once, unless this was its read and it failed.
    if (found !== undefined || watch !== this.#watch) {
      void this.#backfill();
      return;
    }
    const delay = this.#deps.backoffMs(this.#backfillFailures);
    this.#backfillFailures += 1;
    this.#backfillTimer = setTimeout(() => {
      this.#backfillTimer = undefined;
      void this.#backfill();
    }, delay);
  }

  /** The registries' logs from the block after `processedHeight` to the head, at most {@link MAX_BACKFILL_BLOCKS} of them. */
  async #logsSince(
    filters: readonly RegistryLogFilter[],
    processedHeight: bigint,
  ): Promise<readonly (RegistryLog | undefined)[]> {
    const signal = this.#controller.signal;
    const head = await this.#deps.head(signal);
    let from = processedHeight + 1n;
    if (head - from + 1n > MAX_BACKFILL_BLOCKS) from = head - MAX_BACKFILL_BLOCKS + 1n;
    if (from > head || signal.aborted) return [];
    return this.#deps.logs(filters, from, head, signal);
  }

  /** No subscription waits for a read: none is open, or a new one is not confirmed yet. */
  #cancelBackfill(): void {
    this.#backfillDue = false;
    clearTimeout(this.#backfillTimer);
    this.#backfillTimer = undefined;
  }

  // ---------------------------------------------------------------- applying the logs

  async #drain(): Promise<void> {
    if (this.#draining) return;
    this.#draining = true;
    let changed = false;
    try {
      // The live logs wait while a read of what changed before the subscription is in flight.
      while (!this.#closed && !this.#backfilling && this.#queue.length > 0) {
        const log = this.#queue.shift();
        try {
          if (await this.#apply(log)) changed = true;
        } catch (error) {
          if (this.#closed) return;
          // Its block time could not be read. The indexer's view will hold this change.
          this.#deps.warn("a stop registry log could not be applied; that change follows the indexer", { error });
        }
      }
    } finally {
      this.#draining = false;
    }
    if (!changed || this.#closed) return;
    this.#readValues();
    this.#emit();
  }

  /** Applies one log to the overlay. Returns whether the view can change. */
  async #apply(log: RegistryLog | undefined): Promise<boolean> {
    // A log that does not read: the indexer's view will hold its change.
    if (log === undefined || log.blockNumber === null || log.logIndex === null) return false;
    const registry = this.#registries.get(log.address);
    if (registry === undefined) return false;
    const event = StopEvents.stopEventOf(log);
    if (event === undefined) return false;
    if (this.#covered(log.blockNumber)) return false;
    const at: LogPosition = { blockNumber: log.blockNumber, logIndex: log.logIndex };
    const account = this.#deps.account;
    // Each branch asks again after reading the block time: the indexer's view can reach the
    // log's block during that read, and a change it already holds must not land on top.
    switch (event.kind) {
      case "created": {
        if (event.owner !== account || log.transactionHash === null) return false;
        const timestamp = await this.#timeOf(log.blockNumber);
        if (this.#covered(log.blockNumber)) return false;
        const terms = this.#termsOf(registry, event, timestamp, log.transactionHash);
        return terms !== undefined && this.#overlay.created(terms.id, at, timestamp, terms);
      }
      case "intent": {
        const id = stopIdOf(registry.address, event.orderId);
        if (!this.#knows(id)) return false;
        const timestamp = await this.#timeOf(log.blockNumber);
        if (this.#covered(log.blockNumber)) return false;
        return this.#overlay.intent(id, at, timestamp, event.intent);
      }
      case "linked": {
        if (event.owner !== account) return false;
        const timestamp = await this.#timeOf(log.blockNumber);
        if (this.#covered(log.blockNumber)) return false;
        const gte = this.#overlay.sibling(
          stopIdOf(registry.address, event.gteOrderId),
          at,
          timestamp,
          event.lteOrderId,
        );
        const lte = this.#overlay.sibling(
          stopIdOf(registry.address, event.lteOrderId),
          at,
          timestamp,
          event.gteOrderId,
        );
        return gte || lte;
      }
      case "unlinked": {
        const id = stopIdOf(registry.address, event.orderId);
        if (!this.#knows(id)) return false;
        const timestamp = await this.#timeOf(log.blockNumber);
        if (this.#covered(log.blockNumber)) return false;
        return this.#overlay.sibling(id, at, timestamp, null);
      }
      case "ended": {
        const id = stopIdOf(registry.address, event.orderId);
        const ours = event.owner === null ? this.#knows(id) : event.owner === account;
        return ours && this.#overlay.ended(id, at);
      }
    }
  }

  /** Whether the indexer's view already holds what happened at `blockNumber`: its version reached it. */
  #covered(blockNumber: bigint): boolean {
    const version = dataOf(this.#base)?.version.blockNumber;
    return version !== undefined && blockNumber <= version;
  }

  /** Whether the view holds stop `id`: the indexer's view, or a creation on chain. */
  #knows(id: string): boolean {
    return this.#baseIds.has(id) || this.#overlay.holds(id);
  }

  async #timeOf(blockNumber: bigint): Promise<bigint> {
    const known = this.#times.get(blockNumber);
    if (known !== undefined) return known;
    const time = await this.#deps.blockTime(blockNumber, this.#controller.signal);
    this.#times.set(blockNumber, time);
    if (this.#times.size > BLOCK_TIMES_KEPT) {
      const oldest = this.#times.keys().next();
      if (!oldest.done) this.#times.delete(oldest.value);
    }
    return time;
  }

  /**
   *  The terms of a stop created on chain, as the indexer would row them: through the
   *  same wire schema, so a value the indexer's view would refuse is refused here too.
   */
  #termsOf(
    registry: StopRegistry,
    event: Extract<StopEvents.StopEvent, { kind: "created" }>,
    timestamp: bigint,
    transactionHash: Hex,
  ): Rows.AccountStopTerms | undefined {
    const payload = Wire.wireStopPayloadSchema.safeParse({
      market_id: registry.pool,
      orderIdRaw: event.orderId.toString(),
      registry: registry.address,
      isBid: event.terms.isBid,
      quantity: event.terms.quantity.toString(),
      triggerPrice: event.terms.triggerPrice.toString(),
      triggerOperator: event.terms.triggerOperator,
      orderType: event.terms.orderType,
      builder: event.terms.builder,
      builderFeeBpsTimes1k: event.terms.builderFeeBpsTimes1k.toString(),
      status: "PENDING",
      placedOrderId: null,
      dropReason: null,
      siblingOrderId: null,
      // A perp stop is reduce-only until its intent event says otherwise; spot has none.
      intent: registry.venue === "perp" ? 0 : null,
      cancelReason: null,
      createdAt: timestamp.toString(),
      updatedAt: timestamp.toString(),
      txHash: transactionHash.toLowerCase(),
    });
    if (!payload.success) {
      this.#deps.warn("a stop created on chain does not read as a stop row; it follows the indexer", {
        registry: registry.address,
        orderId: event.orderId,
      });
      return undefined;
    }
    return Rows.toStopTerms(stopIdOf(registry.address, event.orderId), this.#deps.account, payload.data);
  }

  // ---------------------------------------------------------------- a new stop's venue and limit price

  /** Reads the venue and limit price of the stops created on chain that have none yet. */
  #readValues(): void {
    const generation = dataOf(this.#base)?.version.datasetGeneration;
    if (generation === undefined || this.#closed) return;
    const terms = this.#overlay
      .createdStops()
      .filter((stop) => !this.#values.has(stop.id) && !this.#valuesReading.has(stop.id));
    if (terms.length === 0) return;
    for (const stop of terms) this.#valuesReading.add(stop.id);
    void this.#deps.enrich(terms, generation, this.#controller.signal).then(
      (enriched) => {
        for (const stop of terms) this.#valuesReading.delete(stop.id);
        if (this.#closed) return;
        for (const stop of enriched) this.#values.set(stop.id, { venue: stop.venue, limitPrice: stop.limitPrice });
        this.#emit();
      },
      () => {
        for (const stop of terms) this.#valuesReading.delete(stop.id);
      },
    );
  }

  /** Forgets the values of stops neither the overlay nor a pending indexer row needs. */
  #forgetValues(data: AccountOrdersData): void {
    const pending = new Set(data.stops.filter(isPending).map((stop) => stop.id));
    for (const id of this.#values.keys()) {
      if (!this.#overlay.holds(id) && !pending.has(id)) this.#values.delete(id);
    }
  }
}
