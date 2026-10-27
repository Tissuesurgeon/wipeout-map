// The outcome-positions account view (SMK-543): the guarded read and the client.
//
// Protocol: indexer/ACCOUNT-VIEW.md, "Outcome positions snapshot". Read the version, the
// rows, then the version again, and accept the rows only when the version did not move.
// The capability publishes no change batches, so a live view watches the version and
// re-reads the whole account when it moves.

import { z } from "zod";
import {
  AccountViewError,
  type AccountViewErrorReason,
  IndexerError,
  IndexerUnavailableError,
  InvalidInputError,
  NotConfiguredError,
} from "../errors.js";
import { graphql } from "../gql/gql.js";
import * as GraphqlBoundary from "../graphqlBoundary.js";
import type { TypedDocument } from "../indexerRead.js";
import * as Raise from "../raise.js";
import type { BinaryMarketStatus } from "../store.js";
import * as AccountViewFailure from "./failure.js";
import * as Reads from "./reads.js";
import * as Registry from "./registry.js";
import type {
  AccountOutcomeClaimable,
  AccountOutcomePosition,
  AccountOutcomePositionsData,
  AccountOutcomePositionsSnapshot,
  AccountOutcomePositionsView,
  AccountOutcomePositionsViewError,
} from "./outcomePositionsTypes.js";
import type { AccountViewUnavailableReason, AccountViewVersion } from "./types.js";

// The SDK's copies of the operations in indexer/account-outcome-positions-view.graphql.
// Keep the selections identical: a READY capability's limits are measured with them.

// prettier-ignore
const VersionQuery = graphql(`
  query OutcomePositionsSnapshotVersion($capabilityId: String!, $guardId: String!) {
    capability: AccountOutcomePositionCapability_by_pk(id: $capabilityId) {
      id
      chainId
      capability
      contractVersion
      datasetGeneration
      manifestDigest
      changeStartBlock
      readiness
      unavailableReason
      positionCapacity
      publicRoleMaxRows
      publicRoleMaxResponseBytes
      indexedFields
      indexedWhenPresentFields
      enrichmentFields
    }
    guard: AccountOutcomePositionGuard_by_pk(id: $guardId) {
      id
      account
      datasetGeneration
      blockNumber
      blockHash
      digest
    }
  }
`);

// prettier-ignore
const RowsQuery = graphql(`
  query AccountOutcomePositionRows($account: String!, $chainId: Int!, $positionLimit: Int!) {
    watermark: chain_metadata(where: { chain_id: { _eq: $chainId } }) {
      latest_processed_block
    }
    positions: OutcomeBalance(
      where: { account: { _eq: $account }, balance: { _gt: 0 } }
      order_by: { id: asc }
      limit: $positionLimit
    ) {
      id
      market_id
      account
      outcomeIndex
      tokenId
      balance
      updatedAtBlock
      market {
        clobStatus
        tradingStart
        expiry
        voided
        finalized
        payoutDenominator
        settledPayoutNumerators
      }
    }
  }
`);

const CAPABILITY = "outcome-positions";
const CONTRACT_VERSION = 1;
const POLL_MS = 5_000;
const SESSION_LINGER_MS = 30_000;
const MAX_RETRY_MS = 60_000;
const UNAVAILABLE_RECHECK_MS = 5 * 60_000;
/** An unservable read is `unavailable`; a broken answer throws. */
type Reason = AccountViewUnavailableReason | AccountViewErrorReason;
const isErrorReason = (reason: Reason): reason is AccountViewErrorReason =>
  reason === "invalidResponse" || reason === "scopeMismatch" || reason === "snapshotUnstable";

interface Unavailable {
  status: "source_unavailable";
  reason: Reason;
  /** The indexer's own reason on an unavailable capability. */
  detail: string | null;
  /** What a validation found, carried into the thrown error's `cause`. */
  cause?: unknown;
}

function unavailable(reason: Reason, detail: string | null = null): Unavailable {
  return { status: "source_unavailable", reason, detail };
}

function invalid(cause: unknown): Unavailable {
  return { ...unavailable("invalidResponse"), cause };
}

/** Read attempts before a moving account is `snapshotUnstable`. The indexer's own tools use three. */
const MAX_ATTEMPTS = 3;

/** The fields contract v1 certifies, indexed or when present: the producer's payload. Tests pin it to its manifests. */
const CERTIFIED_FIELDS = [
  "id",
  "market_id",
  "account",
  "outcomeIndex",
  "tokenId",
  "balance",
  "updatedAtBlock",
  "market.clobStatus",
  "market.tradingStart",
  "market.expiry",
  "market.voided",
  "market.finalized",
  "market.payoutDenominator",
  "market.settledPayoutNumerators",
]
  .sort()
  .join("\n");

/** A uint256 as a decimal string. One check: the bound must not run on a string the pattern rejects. */
const uint = z.string().refine((value) => /^(0|[1-9][0-9]{0,77})$/.test(value) && BigInt(value) < 2n ** 256n);
const hash = z.string().regex(/^0x[0-9a-f]{64}$/);

/** Read before the whole row: an unavailable or older capability can have another shape. */
const headSchema = z.object({
  contractVersion: z.number(),
  readiness: z.string(),
  unavailableReason: z.string().nullish(),
});

const guardSchema = z.object({
  id: z.string(),
  account: z.string(),
  datasetGeneration: z.string(),
  blockNumber: uint,
  blockHash: hash,
  digest: hash,
});

const capabilitySchema = z.object({
  id: z.string(),
  chainId: z.number(),
  capability: z.string(),
  datasetGeneration: z.string().min(1),
  manifestDigest: z.string(),
  changeStartBlock: z.number().int().nonnegative(),
  positionCapacity: z.number().int().positive(),
  publicRoleMaxRows: z.number().int().positive().nullish(),
  publicRoleMaxResponseBytes: z.number().int().positive().nullish(),
  // The fields the indexer certifies; a change between two reads moves the markers.
  indexedFields: z.array(z.string()),
  indexedWhenPresentFields: z.array(z.string()),
  enrichmentFields: z.array(z.string()),
});

const rowSchema = z.object({
  id: z.string().min(1),
  market_id: hash,
  account: z.string(),
  outcomeIndex: z.union([z.literal(0), z.literal(1)]),
  tokenId: uint,
  balance: uint,
  updatedAtBlock: z.number().int().nonnegative(),
  market: z
    .object({
      clobStatus: z.enum(["Listed", "Trading", "Locked", "Settling", "Resolved", "Voided", "Finalized"]).nullish(),
      tradingStart: uint.nullish(),
      expiry: uint.nullish(),
      voided: z.boolean().nullish(),
      finalized: z.boolean().nullish(),
      payoutDenominator: uint.nullish(),
      settledPayoutNumerators: z.array(uint).nullish(),
    })
    .nullish(),
});
type Row = z.infer<typeof rowSchema>;

// The outer shape of each response, checked before any field is read.
const versionResponseSchema = z.object({ capability: z.unknown(), guard: z.unknown() });
const rowsResponseSchema = z.object({
  watermark: z.array(z.object({ latest_processed_block: z.unknown() })),
  positions: z.array(rowSchema),
});

/** Sends one typed read to the indexer. The client supplies it; tests replace it. */
export type OutcomePositionsRequest = <R, V extends Record<string, unknown>>(
  document: TypedDocument<R, V>,
  variables: V,
  options: { signal?: AbortSignal; onResponseBytes?: (bytes: number) => void },
) => Promise<Omit<R, "_sdkWatermark">>;

export interface AccountOutcomePositionsDeps {
  chainId: number;
  request: OutcomePositionsRequest;
  /** Reports contained consumer callback failures through the owner. */
  warn: (message: string, data?: Record<string, unknown>) => void;
  /** The owner's own signal. Its abort ends every live view, as `stopLive()` does. A read it ends rejects with its reason. */
  ownerSignal: AbortSignal | undefined;
  /** The live-read lifecycle at the time of the call. `stopLive()` aborts it. */
  lifecycle: () => AbortSignal | undefined;
  /** The error for a read that `stopLive()` ended. */
  liveReset: (operation: string) => IndexerUnavailableError;
}

/** `client.accountOutcomePositions` and the owner's handle on its live views. */
export interface AccountOutcomePositionsOwner {
  readonly client: AccountOutcomePositionsClient;
  /** Ends every live view with `closed`. */
  stopLive(): void;
}

/**
 *  Options for {@link AccountOutcomePositionsClient.getSnapshot}.
 *
 * @category account views
 */
export interface AccountOutcomePositionsGetSnapshotOptions {
  /** Stops waiting for the read. The caller's abort reason is rethrown unchanged. */
  readonly signal?: AbortSignal;
}

/**
 *  Failures from {@link AccountOutcomePositionsClient.getSnapshot}.
 *
 * @category account views
 */
export type AccountOutcomePositionsClientGetSnapshotError =
  | InvalidInputError
  | NotConfiguredError
  | AccountViewError
  | IndexerUnavailableError
  | IndexerError;

/**
 *  Failures from {@link AccountOutcomePositionsClient.subscribe}. A read that fails
 *  later is delivered as a `failed` or `stale` view, not thrown.
 *
 * @category account views
 */
export type AccountOutcomePositionsClientSubscribeError = InvalidInputError;

/**
 *  One account's event-contract positions on this client's chain: every YES and NO
 *  balance it holds, with the market's status and what the balance redeems for.
 *
 *  Reach it as `client.accountOutcomePositions`. On an exchange, use
 *  `exchange.engineFor(chainId).accountOutcomePositions`.
 *
 *  **Details**
 *
 *  The view is complete at the version it names. It includes markets the account never
 *  traded through the app. Mark price and PnL are not part of it; use
 *  `getOpenPositionsWithPnL` for those.
 *
 *  **Gotchas**
 *
 *  Until the indexer enables this view on a chain, every read there is `unavailable`.
 *  That means the positions are unknown. It never means the account holds nothing.
 *
 * @category account views
 */
export interface AccountOutcomePositionsClient {
  /**
   *  Reads the account's complete outcome positions once.
   *
   *  **Details**
   *
   *  - `account`: The holder's address, in any letter case. The view lower-cases it.
   *  - `options`: `signal` stops waiting.
   *  - Returns: `ready` with every position, `unavailable` when the indexer cannot
   *    serve the view, or `tooLarge` when the account holds more positions than a view
   *    can prove complete, or its response exceeds the indexer's byte limit. Only
   *    `ready` describes the account.
   *
   *  Concurrent calls for one account share one read. Cancelling one caller stops
   *  only that caller; the last caller to cancel aborts the shared read. A ready live
   *  view, including during its 30-second reuse period, supplies the snapshot directly.
   *
   *  The read belongs to the engine's live-read lifecycle: `stopLive()` ends a read in
   *  flight, which then rejects with `IndexerUnavailableError` `live-reset`.
   *
   * **Example** (Listing what an account can claim)
   *
   *  ```ts
   *  const snapshot = await client.accountOutcomePositions.getSnapshot(account);
   *  if (snapshot.status === "ready") {
   *    for (const position of snapshot.data.positions) {
   *      if (position.claimable.status === "known") console.log(position.marketId, position.claimable.amount);
   *    }
   *  }
   *  ```
   *
   * @throws {@link InvalidInputError} `account` is not an address.
   * @throws {@link NotConfiguredError} The client has no indexer endpoint.
   * @throws {@link AccountViewError} The indexer answered, but not with one complete account.
   * @throws {@link IndexerUnavailableError} The SDK held the read back, or `stopLive()` ended it.
   * @throws {@link IndexerError} The request did not complete.
   */
  getSnapshot(
    account: string,
    options?: AccountOutcomePositionsGetSnapshotOptions,
  ): Promise<AccountOutcomePositionsSnapshot>;
  /**
   *  Keeps the account's outcome positions current and calls `onView` with each change.
   *
   *  **Details**
   *
   *  - `account`: The holder's address, in any letter case.
   *  - `onView`: Receives the whole view each time: `loading` first, then `ready`,
   *    `unavailable` or `tooLarge`. A read that fails gives `failed`, or `stale` with
   *    the last complete data, and the SDK tries again.
   *  - Returns: A function that stops this subscription. Calling it twice is safe.
   *
   *  Subscriptions to one account share one reader, and a later subscriber gets the
   *  current view at once. After the last subscription stops, the reader stays active
   *  for 30 seconds. A subscription during that time reuses the view and reader.
   *  Successful reads watch the version every five seconds. Failed reads retry
   *  after 5, 10, 20, 40, then at most 60 seconds. Missing indexer configuration
   *  reports `failed` with `retrying: false` and starts no retry. `unavailable`
   *  states recheck the capability over HTTP every five minutes. There is no socket
   *  capability watch, so a newly available capability waits for that recheck. Recovery
   *  restores the five-second cadence. `tooLarge` keeps watching the version without
   *  reading the same oversized rows again. Held data still follows the clock while
   *  retries wait. A newer view always has a larger `revision`. `stopLive()`, or the
   *  client's `signal`, ends every reader immediately, including during the 30-second
   *  reuse period. Active subscriptions receive `closed`, and no view follows it.
   *  A listener that throws is isolated; the owner reports its error as a warning.
   *
   * @throws {@link InvalidInputError} `account` is not an address.
   */
  subscribe(account: string, onView: (view: AccountOutcomePositionsView) => void): () => void;
}

type Capability = z.infer<typeof capabilitySchema>;
type Markers = { status: "ok"; capability: Capability; version: AccountViewVersion };
type ReadResult =
  | { status: "ready"; data: AccountOutcomePositionsData; rows: readonly Row[]; markers: Markers }
  | { status: "tooLarge"; collection: "positions" | "responseBytes"; capacity: number; markers: Markers }
  | Unavailable;

/** A deployment that does not serve the capability answers the version read with this GraphQL error. */
const NOT_SERVED = /AccountOutcomePosition(Capability|Guard)_by_pk[\s\S]*not\s+found/i;

function checkCapability(raw: unknown, chainId: number): { status: "ok"; capability: Capability } | Unavailable {
  if (raw == null) return unavailable("capabilityMissing");
  const head = headSchema.safeParse(raw);
  if (!head.success) return invalid(head.error);
  if (head.data.contractVersion !== CONTRACT_VERSION) return unavailable("unsupportedContractVersion");
  if (head.data.readiness === "UNAVAILABLE") {
    return unavailable("capabilityUnavailable", head.data.unavailableReason ?? null);
  }
  const parsed = capabilitySchema.safeParse(raw);
  if (head.data.readiness !== "READY" || !parsed.success) return invalid(parsed.error);
  const capability = parsed.data;
  if (
    capability.chainId !== chainId ||
    capability.id !== `${chainId}:${CAPABILITY}` ||
    capability.capability !== CAPABILITY
  ) {
    return unavailable("scopeMismatch");
  }
  // A capability that certifies other fields does not vouch for these rows.
  const certified = [...capability.indexedFields, ...capability.indexedWhenPresentFields].sort().join("\n");
  if (certified !== CERTIFIED_FIELDS) return unavailable("invalidResponse");
  if (
    capability.publicRoleMaxRows == null ||
    capability.publicRoleMaxResponseBytes == null ||
    capability.publicRoleMaxRows < capability.positionCapacity + 1
  ) {
    return unavailable("publicRoleLimitsUnproved");
  }
  return { status: "ok", capability };
}

function sameMarkers(left: Markers, right: Markers): boolean {
  const key = (markers: Markers): string =>
    JSON.stringify([markers.capability, { ...markers.version, blockNumber: markers.version.blockNumber.toString() }]);
  return key(left) === key(right);
}

/** A new generation is a reset, never older. */
function olderThan(next: Markers, held: Markers): boolean {
  return (
    next.version.datasetGeneration === held.version.datasetGeneration &&
    next.version.blockNumber < held.version.blockNumber
  );
}

/** `clobStatus` is the last lifecycle event. Listed, Trading and Locked emit none, so they follow the clock. */
function statusOf(market: NonNullable<Row["market"]>, nowSec: bigint): BinaryMarketStatus | null {
  const event = market.clobStatus;
  if (event != null && event !== "Listed" && event !== "Trading" && event !== "Locked") return event;
  if (market.tradingStart == null || market.expiry == null) return null;
  if (nowSec < BigInt(market.tradingStart)) return "Listed";
  return nowSec < BigInt(market.expiry) ? "Trading" : "Locked";
}

/** A binary settled vector has two entries summing to at most the denominator, so no side pays more than it holds. */
function settledVectorFits(row: Row): boolean {
  const vector = row.market?.settledPayoutNumerators;
  if (vector == null) return true;
  const denominator = BigInt(row.market?.payoutDenominator ?? 0);
  return vector.length === 2 && vector.reduce((sum, n) => sum + BigInt(n), 0n) <= denominator;
}

function claimableOf(row: Row): AccountOutcomeClaimable {
  const market = row.market;
  if (market == null) return { status: "unknown", reason: "marketMissing" };
  if (!market.finalized) return { status: "unsettled" };
  const numerator = market.settledPayoutNumerators?.[row.outcomeIndex];
  const denominator = market.payoutDenominator == null ? 0n : BigInt(market.payoutDenominator);
  if (numerator === undefined || denominator === 0n) return { status: "unknown", reason: "payoutVectorMissing" };
  return { status: "known", amount: (BigInt(row.balance) * BigInt(numerator)) / denominator };
}

function positionOf(row: Row, nowSec: bigint): AccountOutcomePosition {
  return {
    id: row.id,
    marketId: row.market_id,
    outcomeIndex: row.outcomeIndex,
    tokenId: BigInt(row.tokenId),
    balance: BigInt(row.balance),
    status: row.market == null ? null : statusOf(row.market, nowSec),
    claimable: claimableOf(row),
    updatedAtBlock: BigInt(row.updatedAtBlock),
  };
}

const ADDRESS = /^0x[0-9a-f]{40}$/;

/** Builds `client.accountOutcomePositions`. One per engine. */
export function createAccountOutcomePositionsWithDeps(deps: AccountOutcomePositionsDeps): AccountOutcomePositionsOwner {
  const { chainId, request } = deps;
  const nowSec = (): bigint => BigInt(Math.floor(Date.now() / 1000));
  let revision = 0;
  // A guard id names its dataset generation, so the last one seen saves a request.
  let generation: string | null = null;

  function normalize(account: string, operation: string): string {
    const lower = typeof account === "string" ? account.toLowerCase() : "";
    if (!ADDRESS.test(lower))
      throw new InvalidInputError(`${operation}: account must be an address, got ${String(account)}`);
    return lower;
  }

  async function readMarkers(account: string, signal?: AbortSignal): Promise<Markers | Unavailable> {
    // Twice at most: the second pass asks for the guard under the generation the first one found.
    for (let pass = 0; pass < 2; pass += 1) {
      signal?.throwIfAborted();
      // Another read can change `generation` while this one waits, so check the answer
      // against the generation this request asked under.
      const asked = generation;
      let response;
      try {
        const guardId = asked === null ? "" : `${asked}:${account}`;
        response = await request(VersionQuery, { capabilityId: `${chainId}:${CAPABILITY}`, guardId }, { signal });
      } catch (error) {
        if (error instanceof IndexerError && NOT_SERVED.test(error.message)) return unavailable("capabilityMissing");
        throw error;
      }
      signal?.throwIfAborted();
      const body = versionResponseSchema.safeParse(response);
      if (!body.success) return invalid(body.error);
      const data = body.data;
      const checked = checkCapability(data.capability, chainId);
      if (checked.status !== "ok") return checked;
      const { capability } = checked;
      if (capability.datasetGeneration !== asked) {
        generation = capability.datasetGeneration;
        continue;
      }
      // An account the indexer never changed has the zero version: block 0, no hash, no digest.
      if (data.guard == null) {
        const version = { datasetGeneration: asked, blockNumber: 0n, blockHash: null, digest: null };
        return { status: "ok", capability, version };
      }
      const guard = guardSchema.safeParse(data.guard);
      if (!guard.success) return invalid(guard.error);
      if (
        guard.data.id !== `${asked}:${account}` ||
        guard.data.account !== account ||
        guard.data.datasetGeneration !== asked
      ) {
        return unavailable("scopeMismatch");
      }
      const { blockNumber, blockHash, digest } = guard.data;
      const version = { datasetGeneration: asked, blockNumber: BigInt(blockNumber), blockHash, digest };
      return { status: "ok", capability, version };
    }
    return unavailable("snapshotUnstable");
  }

  async function read(account: string, signal?: AbortSignal): Promise<ReadResult> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const before = await readMarkers(account, signal);
      signal?.throwIfAborted();
      if (before.status !== "ok") return before;
      const { capability, version } = before;
      // The role serves an oversized response whole, so the read measures it against the
      // byte ceiling. A refusal that names the size, or no measurement, is the same result.
      let responseBytes: number | undefined;
      let response: unknown;
      try {
        response = await request(
          RowsQuery,
          { account, chainId, positionLimit: capability.positionCapacity + 1 },
          { signal, onResponseBytes: (bytes) => void (responseBytes = bytes) },
        );
      } catch (error) {
        if (!(error instanceof IndexerError && Reads.isResponseSizeRefusal(error.message))) throw error;
      }
      signal?.throwIfAborted();
      const after = await readMarkers(account, signal);
      if (after.status !== "ok" || !sameMarkers(before, after)) continue;
      const overBytes = {
        status: "tooLarge",
        collection: "responseBytes",
        capacity:
          capability.publicRoleMaxResponseBytes ?? Raise.unreachable("checkCapability requires the byte ceiling"),
        markers: before,
      } as const;
      if (responseBytes === undefined) return overBytes;

      const body = rowsResponseSchema.safeParse(response);
      if (!body.success) return invalid(body.error);
      const rows = body.data;
      // Chain progress is a GraphQL Int. Exactly one row for this chain, or it certifies nothing.
      const height: unknown = rows.watermark[0]?.latest_processed_block;
      if (rows.watermark.length !== 1 || typeof height !== "number" || !Number.isSafeInteger(height) || height < 0) {
        return unavailable("rebuildInProgress");
      }
      const processedHeight = BigInt(height);
      // A replica behind the guard has not processed the rows the version claims.
      if (processedHeight < BigInt(capability.changeStartBlock) || processedHeight < version.blockNumber) {
        return unavailable("rebuildInProgress");
      }

      const positions: AccountOutcomePosition[] = [];
      const now = nowSec();
      for (const row of rows.positions) {
        if (row.account !== account) return unavailable("scopeMismatch");
        // A row newer than the version would file a newer balance under an older version.
        if (row.updatedAtBlock >= capability.changeStartBlock && BigInt(row.updatedAtBlock) > version.blockNumber) {
          return unavailable("invalidResponse");
        }
        if (BigInt(row.balance) === 0n || !settledVectorFits(row)) return unavailable("invalidResponse");
        positions.push(positionOf(row, now));
      }
      // Only after every row checks out does the count prove the account is over capacity.
      if (positions.length > capability.positionCapacity) {
        return { status: "tooLarge", collection: "positions", capacity: capability.positionCapacity, markers: before };
      }
      if (responseBytes > overBytes.capacity) return overBytes;
      return {
        status: "ready",
        markers: before,
        rows: rows.positions,
        data: { positions, version, processedHeight, observedAtMs: Date.now() },
      };
    }
    return unavailable("snapshotUnstable");
  }

  /** The public result of a read. A broken answer throws; an unservable one is `unavailable`. */
  function resultOf(result: ReadResult, account: string, operation: string): AccountOutcomePositionsSnapshot {
    const scope = { chainId, account, revision: ++revision };
    if (result.status === "ready") return { ...scope, status: "ready", data: result.data };
    if (result.status === "tooLarge") {
      return { ...scope, status: "tooLarge", collection: result.collection, capacity: result.capacity };
    }
    const { reason } = result;
    if (!isErrorReason(reason)) return { ...scope, status: "unavailable", reason, detail: result.detail };
    throw new AccountViewError(
      operation,
      reason,
      `the indexer did not answer with one complete account (${result.reason})`,
      { chainId, cause: result.cause },
    );
  }

  interface Session {
    account: string;
    listeners: Set<(view: AccountOutcomePositionsView) => void>;
    view: AccountOutcomePositionsView;
    /** The version of the last accepted read. A tick re-reads the rows only when it moves. */
    markers: Markers | null;
    /** The last complete read: what `stale` shows. The rows re-derive each status as the clock moves. */
    ready: { data: AccountOutcomePositionsData; rows: readonly Row[] } | null;
    controller: AbortController;
    timer: ReturnType<typeof setTimeout> | undefined;
    lingerTimer: ReturnType<typeof setTimeout> | undefined;
    /** Count down on poll ticks so clock adjustments do not change the retry cadence. */
    retryWaitMs: number;
    nextRetryMs: number;
    terminal: boolean;
  }
  const sessions = new Map<string, Session>();
  const snapshots = new Registry.SingleFlight<AccountOutcomePositionsSnapshot>();

  /** A listener's own error must not stop the view for the others, or leak the session. */
  function deliver(listener: (view: AccountOutcomePositionsView) => void, view: AccountOutcomePositionsView): void {
    try {
      listener(view);
    } catch (error) {
      deps.warn("an account view listener threw", { error });
    }
  }

  function emit(session: Session, view: AccountOutcomePositionsView): void {
    // `closed` is final, even for a read that was already on the wire.
    if (session.view.status === "closed") return;
    if (session.controller.signal.aborted && view.status !== "closed") return;
    session.view = view;
    // A snapshot: a listener added during delivery already got this view from subscribe().
    for (const listener of Array.from(session.listeners)) if (session.listeners.has(listener)) deliver(listener, view);
  }

  /** Listed, Trading and Locked follow the clock, and passing a boundary does not move the version. */
  function rederive(session: Session): boolean {
    if (session.ready === null) return false;
    const { data, rows } = session.ready;
    const now = nowSec();
    const positions = rows.map((row) => positionOf(row, now));
    const changed = positions.some((position, index) => position.status !== data.positions[index]?.status);
    if (changed) session.ready = { rows, data: { ...data, positions } };
    return changed;
  }

  // ponytail: polls the version, one small request per account per tick. A Hasura live
  // query over the indexer WebSocket (graphqlWs.ts) would push it instead.
  async function tick(session: Session): Promise<void> {
    const { account, controller } = session;
    session.timer = undefined;
    const operation = "accountOutcomePositions.subscribe";
    try {
      if (controller.signal.aborted) return;
      session.retryWaitMs = Math.max(0, session.retryWaitMs - POLL_MS);
      if (session.retryWaitMs > 0) {
        if (rederive(session) && session.view.status === "stale" && session.ready !== null) {
          emit(session, { ...session.view, revision: ++revision, data: session.ready.data });
        }
        return;
      }
      const markers = session.markers === null ? null : await readMarkers(account, controller.signal);
      if (controller.signal.aborted) return;
      const moved = session.markers === null || markers?.status !== "ok" || !sameMarkers(session.markers, markers);
      if (moved) {
        const result = await read(account, controller.signal);
        if (controller.signal.aborted) return;
        // A lagging replica: keep the newer version already shown.
        if (!("markers" in result && session.markers !== null && olderThan(result.markers, session.markers))) {
          // A broken answer throws here, before the held data is replaced, so the view goes stale.
          const view = resultOf(result, account, operation);
          if (view.status === "unavailable") session.retryWaitMs = UNAVAILABLE_RECHECK_MS;
          else resetBackoff(session);
          session.markers = "markers" in result ? result.markers : null;
          session.ready = result.status === "ready" ? { data: result.data, rows: result.rows } : null;
          const held = session.view;
          const unchanged =
            view.status === "unavailable" &&
            held.status === "unavailable" &&
            view.reason === held.reason &&
            view.detail === held.detail;
          if (!unchanged) emit(session, view);
        }
      } else if (session.ready !== null) {
        resetBackoff(session);
        if (rederive(session) || session.view.status === "stale") {
          emit(session, { chainId, account, revision: ++revision, status: "ready", data: session.ready.data });
        }
      } else resetBackoff(session);
    } catch (thrown) {
      if (controller.signal.aborted) return;
      // The request boundary supplies semantic errors. Preserve them and retain
      // evidence if an internal request implementation violates that contract.
      const error: AccountOutcomePositionsViewError =
        thrown instanceof IndexerError || thrown instanceof NotConfiguredError
          ? thrown
          : new IndexerError(operation, "outcome positions read failed", { cause: thrown });
      session.terminal = error instanceof NotConfiguredError;
      if (!session.terminal) backoff(session);
      const scope = { chainId, account, revision: ++revision };
      if (session.ready === null) {
        // Nothing to fall back on, so the next tick reads the account in full.
        session.markers = null;
        emit(session, {
          ...scope,
          status: "failed",
          reason: AccountViewFailure.accountViewFailureReason(error) ?? "requestFailed",
          error,
          retrying: !session.terminal,
        });
      } else {
        rederive(session);
        emit(session, { ...scope, status: "stale", data: session.ready.data, error });
      }
    } finally {
      if (!controller.signal.aborted && !session.terminal) {
        session.timer = setTimeout(() => void tick(session), POLL_MS);
      }
    }
  }

  function backoff(session: Session): void {
    session.retryWaitMs = session.nextRetryMs;
    session.nextRetryMs = Math.min(MAX_RETRY_MS, session.nextRetryMs * 2);
  }

  function resetBackoff(session: Session): void {
    session.retryWaitMs = 0;
    session.nextRetryMs = POLL_MS;
  }

  function end(session: Session): void {
    session.controller.abort();
    clearTimeout(session.timer);
    clearTimeout(session.lingerTimer);
    session.timer = undefined;
    session.lingerTimer = undefined;
    // A late unsubscribe from a closed session must not drop the account's new reader.
    if (sessions.get(session.account) === session) sessions.delete(session.account);
  }

  /** The owner closed the client: nothing reads for it any more. */
  const ownerClosed = (): boolean => deps.ownerSignal?.aborted === true;

  const client: AccountOutcomePositionsClient = {
    async getSnapshot(input, options) {
      const operation = "accountOutcomePositions.getSnapshot";
      const account = normalize(input, operation);
      options?.signal?.throwIfAborted();
      if (ownerClosed()) throw deps.ownerSignal?.reason;
      // Taken once, so a read that spans `stopLive()` cannot finish on the next lifecycle.
      const lifecycle = deps.lifecycle();
      try {
        for (let attempt = 1; ; attempt += 1) {
          options?.signal?.throwIfAborted();
          deps.ownerSignal?.throwIfAborted();
          lifecycle?.throwIfAborted();
          const current = sessions.get(account)?.view;
          // A detected conflict requires another guarded read even when the live view
          // is ready. Its unchanged identity cannot resolve the replica disagreement.
          if (attempt === 1 && current?.status === "ready") return current;
          const snapshot = await snapshots.run(
            account,
            lifecycle,
            async (signal) => {
              const linked = GraphqlBoundary.linkSignals(signal, deps.ownerSignal, lifecycle);
              try {
                const result = await read(account, linked.signal);
                linked.signal?.throwIfAborted();
                return resultOf(result, account, operation);
              } finally {
                linked.dispose();
              }
            },
            options?.signal,
          );
          options?.signal?.throwIfAborted();
          deps.ownerSignal?.throwIfAborted();
          lifecycle?.throwIfAborted();
          const latest = sessions.get(account)?.view;
          // Generations cannot be ordered by block. Reconcile again under the current
          // generation, as orders do, before returning a snapshot that could move back.
          if (snapshot.status === "ready" && (latest?.status === "ready" || latest?.status === "stale")) {
            const held = latest.data.version;
            const readVersion = snapshot.data.version;
            if (held.datasetGeneration !== readVersion.datasetGeneration) {
              if (attempt < MAX_ATTEMPTS) continue;
              throw new AccountViewError(
                operation,
                "snapshotUnstable",
                "every read answered with a different generation than the live view",
                { chainId },
              );
            }
            if (
              held.blockNumber === readVersion.blockNumber &&
              (held.blockHash !== readVersion.blockHash || held.digest !== readVersion.digest)
            ) {
              if (attempt < MAX_ATTEMPTS) continue;
              throw new AccountViewError(
                operation,
                "snapshotUnstable",
                "every read answered with a conflicting version at the live view's block",
                { chainId },
              );
            }
            if (held.blockNumber >= readVersion.blockNumber && latest.status === "ready") return latest;
            if (held.blockNumber > readVersion.blockNumber) {
              if (attempt < MAX_ATTEMPTS) continue;
              throw new AccountViewError(
                operation,
                "snapshotUnstable",
                "every read answered with an older version than the live view",
                { chainId },
              );
            }
          }
          return snapshot;
        }
      } catch (error) {
        // Caller cancellation takes precedence over an overlapping live reset.
        options?.signal?.throwIfAborted();
        deps.ownerSignal?.throwIfAborted();
        if (lifecycle?.aborted === true && !ownerClosed() && !(error instanceof IndexerUnavailableError)) {
          throw deps.liveReset(operation);
        }
        throw error;
      }
    },
    subscribe(input, onView) {
      const account = normalize(input, "accountOutcomePositions.subscribe");
      // No live view starts again for a closed client.
      if (ownerClosed()) {
        deliver(onView, { chainId, account, revision: ++revision, status: "closed" });
        return () => {};
      }
      let session = sessions.get(account);
      if (session === undefined) {
        session = {
          account,
          listeners: new Set(),
          view: { chainId, account, revision: ++revision, status: "loading" },
          markers: null,
          ready: null,
          controller: new AbortController(),
          timer: undefined,
          lingerTimer: undefined,
          retryWaitMs: 0,
          nextRetryMs: POLL_MS,
          terminal: false,
        };
        sessions.set(account, session);
        void tick(session);
      }
      const joined = session;
      clearTimeout(joined.lingerTimer);
      joined.lingerTimer = undefined;
      // A wrapper per call, so one function subscribed twice holds two subscriptions.
      const listener = (view: AccountOutcomePositionsView): void => onView(view);
      joined.listeners.add(listener);
      deliver(listener, joined.view);
      return () => {
        if (!joined.listeners.delete(listener)) return;
        if (joined.listeners.size === 0 && !joined.controller.signal.aborted) {
          joined.lingerTimer = setTimeout(() => end(joined), SESSION_LINGER_MS);
        }
      };
    },
  };

  const stopLive = (): void => {
    // A snapshot, and each ended first, so a listener that subscribes again on `closed` starts a new reader.
    for (const session of Array.from(sessions.values())) {
      end(session);
      emit(session, { chainId, account: session.account, revision: ++revision, status: "closed" });
      session.listeners.clear();
    }
  };
  // The owner's close ends live views too, so no session reads for a closed client.
  deps.ownerSignal?.addEventListener("abort", stopLive, { once: true });
  return { client, stopLive };
}
