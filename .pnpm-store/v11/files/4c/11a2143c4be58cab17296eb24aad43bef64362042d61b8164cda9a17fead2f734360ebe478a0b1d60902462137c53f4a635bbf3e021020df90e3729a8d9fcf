// The stop changes a live orders view took from the chain, ahead of the indexer.
//
// The indexer's view is complete at its version. A stop registry event in a later block
// is a change the indexer has not applied yet, so the live view keeps it here and shows
// the indexer's stops with these changes on top. Once the view's version reaches a
// change's block, the indexer holds that change and it is dropped here.
//
// Changes are kept per stop and per kind, each with the position of its log, so the same
// event read twice, or a log that arrives after a later one, changes nothing: a creation
// counts once, an end is final, and a link or an intent keeps its newest value.

import * as PerpStops from "../perp/stops.js";
import * as Rows from "./rows.js";
import type { AccountStopTerms } from "./rows.js";
import type { AccountStop, AccountStopLimitPrice, AccountStopVenue } from "./types.js";

/** Where a log sits in the chain, so two changes of one stop can be ordered. */
export interface LogPosition {
  readonly blockNumber: bigint;
  readonly logIndex: number;
}

/** Whether `a` comes after `b` in the chain. */
export function isAfter(a: LogPosition, b: LogPosition): boolean {
  return a.blockNumber > b.blockNumber || (a.blockNumber === b.blockNumber && a.logIndex > b.logIndex);
}

/** A change, where its log sits, and its block's time in Unix seconds. */
interface Stamped<T> {
  readonly at: LogPosition;
  readonly timestamp: bigint;
  readonly value: T;
}

interface Entry {
  created?: Stamped<AccountStopTerms>;
  ended?: LogPosition;
  sibling?: Stamped<bigint | null>;
  intent?: Stamped<number>;
}

/** A stop's venue and limit price, which the view reads apart from its terms. */
export interface StopValues {
  readonly venue: AccountStopVenue;
  readonly limitPrice: AccountStopLimitPrice;
}

export class StopOverlay {
  readonly #entries = new Map<string, Entry>();

  #entry(id: string): Entry {
    let entry = this.#entries.get(id);
    if (entry === undefined) {
      entry = {};
      this.#entries.set(id, entry);
    }
    return entry;
  }

  /** Whether the overlay holds a stop created on chain that has not ended. */
  holds(id: string): boolean {
    const entry = this.#entries.get(id);
    return entry?.created !== undefined && entry.ended === undefined;
  }

  /** The stops created on chain that have not ended, with their terms. */
  createdStops(): AccountStopTerms[] {
    const terms: AccountStopTerms[] = [];
    for (const entry of this.#entries.values()) {
      if (entry.created !== undefined && entry.ended === undefined) terms.push(entry.created.value);
    }
    return terms;
  }

  /** Whether nothing is held. */
  isEmpty(): boolean {
    return this.#entries.size === 0;
  }

  /** The newest block of any change held, or `null` when none is. */
  latestBlock(): bigint | null {
    let latest: bigint | null = null;
    for (const entry of this.#entries.values()) {
      for (const at of [entry.created?.at, entry.ended, entry.sibling?.at, entry.intent?.at]) {
        if (at !== undefined && (latest === null || at.blockNumber > latest)) latest = at.blockNumber;
      }
    }
    return latest;
  }

  /** A stop was created. Returns whether anything changed: a creation counts once. */
  created(id: string, at: LogPosition, timestamp: bigint, terms: AccountStopTerms): boolean {
    const entry = this.#entry(id);
    if (entry.created !== undefined) return false;
    entry.created = { at, timestamp, value: terms };
    return true;
  }

  /** A stop's intent was set. Returns whether anything changed. */
  intent(id: string, at: LogPosition, timestamp: bigint, intent: number): boolean {
    const entry = this.#entry(id);
    if (entry.intent !== undefined && !isAfter(at, entry.intent.at)) return false;
    entry.intent = { at, timestamp, value: intent };
    return true;
  }

  /** A stop was linked to its other leg, or unlinked (`null`). Returns whether anything changed. */
  sibling(id: string, at: LogPosition, timestamp: bigint, siblingOrderId: bigint | null): boolean {
    const entry = this.#entry(id);
    if (entry.sibling !== undefined && !isAfter(at, entry.sibling.at)) return false;
    entry.sibling = { at, timestamp, value: siblingOrderId };
    return true;
  }

  /** A stop is no longer pending. Returns whether anything changed: an end is final. */
  ended(id: string, at: LogPosition): boolean {
    const entry = this.#entry(id);
    if (entry.ended !== undefined) return false;
    entry.ended = at;
    return true;
  }

  /**
   *  Drops every change at or before `versionBlock`, which the indexer's view now holds.
   *  Returns whether anything was dropped.
   */
  prune(versionBlock: bigint): boolean {
    let dropped = false;
    for (const [id, entry] of this.#entries) {
      if (entry.created !== undefined && entry.created.at.blockNumber <= versionBlock) {
        delete entry.created;
        dropped = true;
      }
      if (entry.ended !== undefined && entry.ended.blockNumber <= versionBlock) {
        delete entry.ended;
        dropped = true;
      }
      if (entry.sibling !== undefined && entry.sibling.at.blockNumber <= versionBlock) {
        delete entry.sibling;
        dropped = true;
      }
      if (entry.intent !== undefined && entry.intent.at.blockNumber <= versionBlock) {
        delete entry.intent;
        dropped = true;
      }
      if (
        entry.created === undefined &&
        entry.ended === undefined &&
        entry.sibling === undefined &&
        entry.intent === undefined
      ) {
        this.#entries.delete(id);
      }
    }
    return dropped;
  }

  /**
   *  The indexer's stops with the changes held here on top, sorted by id. A stop created
   *  here takes its venue and limit price from `valuesOf`. A stop the overlay does not
   *  touch keeps its object.
   */
  merge(base: readonly AccountStop[], valuesOf: (id: string) => StopValues): readonly AccountStop[] {
    const byId = new Map(base.map((stop) => [stop.id, stop]));
    for (const [id, entry] of this.#entries) {
      if (entry.ended !== undefined) {
        byId.delete(id);
        continue;
      }
      const held = byId.get(id);
      let stop: AccountStop | undefined =
        held ?? (entry.created === undefined ? undefined : { ...entry.created.value, ...valuesOf(id) });
      // A link or an intent for a stop neither side holds: its creation is older than
      // both, or it ended in the indexer's view.
      if (stop === undefined) continue;
      if (entry.sibling !== undefined) {
        const siblingOrderId = entry.sibling.value;
        stop = {
          ...stop,
          siblingOrderId,
          // A linked pair is two stops in one registry.
          siblingId: siblingOrderId === null ? null : `${stop.registry}_${siblingOrderId}`,
          updatedAt: latest(stop.updatedAt, entry.sibling.timestamp),
        };
      }
      if (entry.intent !== undefined) {
        stop = {
          ...stop,
          intent: PerpStops.decodeIntent(entry.intent.value),
          updatedAt: latest(stop.updatedAt, entry.intent.timestamp),
        };
      }
      // An untouched stop is the indexer's object, frozen already: freezing keeps it.
      byId.set(id, Object.freeze(stop));
    }
    return Rows.byId([...byId.values()]);
  }
}

function latest(left: bigint, right: bigint): bigint {
  return left > right ? left : right;
}
