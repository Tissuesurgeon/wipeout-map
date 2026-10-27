import { AccountViewError, IndexerError, IndexerUnavailableError, InvalidInputError, NotConfiguredError } from "../errors.js";
import type { TypedDocument } from "../indexerRead.js";
import type { AccountOutcomePositionsSnapshot, AccountOutcomePositionsView } from "./outcomePositionsTypes.js";
/** Sends one typed read to the indexer. The client supplies it; tests replace it. */
export type OutcomePositionsRequest = <R, V extends Record<string, unknown>>(document: TypedDocument<R, V>, variables: V, options: {
    signal?: AbortSignal;
    onResponseBytes?: (bytes: number) => void;
}) => Promise<Omit<R, "_sdkWatermark">>;
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
export type AccountOutcomePositionsClientGetSnapshotError = InvalidInputError | NotConfiguredError | AccountViewError | IndexerUnavailableError | IndexerError;
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
    getSnapshot(account: string, options?: AccountOutcomePositionsGetSnapshotOptions): Promise<AccountOutcomePositionsSnapshot>;
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
/** Builds `client.accountOutcomePositions`. One per engine. */
export declare function createAccountOutcomePositionsWithDeps(deps: AccountOutcomePositionsDeps): AccountOutcomePositionsOwner;
