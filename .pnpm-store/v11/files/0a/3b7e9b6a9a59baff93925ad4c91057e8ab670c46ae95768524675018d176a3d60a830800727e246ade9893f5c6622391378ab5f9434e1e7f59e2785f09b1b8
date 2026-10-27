// Public types of the account view: what `client.accountOrders` returns.
//
// An account view is one account's complete open orders and pending stops on one
// chain, at one version the indexer certifies. These types are the SDK's domain
// contract (SDK-TYPE-008). Protocol integers are `bigint` raw units (SDK-TYPE-007).
// Addresses and hashes stay lower-case strings, as the SDK's other row types keep them.

import type {
  AccountViewError,
  AccountViewErrorReason,
  ContractRevertError,
  IndexerError,
  IndexerUnavailableError,
  NotConfiguredError,
  RpcError,
} from "../errors.js";
import type { PerpStopDropReason } from "../perp/stops.js";
import type { BinarySide } from "../store.js";
import type { PerpStopIntent } from "../trade.js";

/**
 *  Options for {@link AccountOrdersClient.getSnapshot}.
 *
 * @category account views
 */
export interface AccountOrdersGetSnapshotOptions {
  /** Stops the read. The caller's abort reason is rethrown unchanged. */
  readonly signal?: AbortSignal;
}

/**
 *  One open order in an account view.
 *
 *  The field names follow {@link OrderRow}. The values are raw `bigint` units.
 *
 * @category account views
 */
export interface AccountOrder {
  /** The row id: `<pool>_<orderId>`, lower-case. Unique on its chain. */
  readonly id: string;
  /** The indexer's market id: the pool address for spot and perp, the bytes32 market id for binary. */
  readonly market: string;
  /** The pool that holds the order, lower-case. */
  readonly pool: string;
  /** The pool's order id. */
  readonly orderId: bigint;
  /** The raw order id the pool emitted. */
  readonly orderIdRaw: bigint;
  /** The account that owns the order, lower-case. */
  readonly owner: string;
  /** `true` for a buy, `false` for a sell. */
  readonly isBid: boolean;
  /** The binary outcome side, or `null` outside binary markets. */
  readonly side: BinarySide | null;
  /** The caller data the order was placed with. */
  readonly userData: bigint;
  /** The limit price, raw quote units. */
  readonly price: bigint;
  /** The original size, raw base or outcome units. */
  readonly fullQuantity: bigint;
  /** The size still resting, raw base or outcome units. */
  readonly quantityRemaining: bigint;
  /** The size filled so far, raw base or outcome units. */
  readonly filledQuantity: bigint;
  /** The expiry as a nanosecond timestamp. `0n` means the order does not expire, as in the SDK's order book. */
  readonly expireTimestampNs: bigint;
  /** Always `"Open"`: an account view holds open orders only. */
  readonly status: "Open";
  /** Whether the order ever rested on the book. */
  readonly rested: boolean;
  /** Why the protocol cancelled part of the order, or `null`. */
  readonly cancelReason: string | null;
  /** The order this one replaced by an amend, or `null`. */
  readonly amendedFromOrderId: bigint | null;
  /** The order that replaced this one by an amend, or `null`. */
  readonly amendedToOrderId: bigint | null;
  /** The block the order was placed in. */
  readonly placedAtBlock: bigint;
  /** When the order was placed, in Unix seconds. */
  readonly placedAtTimestamp: bigint;
  /** The transaction that placed the order. */
  readonly placedTxHash: string;
  /** The block of the order's last change. */
  readonly lastUpdatedAtBlock: bigint;
  /** When the order last changed, in Unix seconds. */
  readonly lastUpdatedAtTimestamp: bigint;
}

/**
 *  Which kind of market a stop belongs to.
 *
 *  The stop row does not say, so the SDK reads the type of the stop's pool from the
 *  indexer. `unknown` keeps the reason and, for a failed read, the error. `pending`
 *  appears only in a live view, while the SDK reads the value for a new stop; a later
 *  view carries it.
 *
 *  | Reason | Means |
 *  | --- | --- |
 *  | `unlistedMarket` | The indexer has no spot or perp market for the stop's pool. |
 *  | `readFailed` | The pool's type could not be read. `error` says why. A live view reads it again, up to three times. |
 *
 * @category account views
 */
export type AccountStopVenue =
  | { readonly status: "known"; readonly venue: "spot" | "perp" }
  | { readonly status: "pending" }
  | { readonly status: "unknown"; readonly reason: "unlistedMarket"; readonly error: null }
  | { readonly status: "unknown"; readonly reason: "readFailed"; readonly error: IndexerError };

/**
 *  The limit price of the order a stop places.
 *
 *  No indexer event carries it, so the SDK reads it from the perp stop registry. A
 *  MARKET stop has no limit price. A price the SDK cannot read is `unknown`, never
 *  zero. `pending` appears only in a live view, while the SDK reads the price for a new
 *  stop; a later view carries it.
 *
 *  | Reason | Means |
 *  | --- | --- |
 *  | `spotUnreadable` | The stop is on spot. The spot registry has no read for a stop's terms. |
 *  | `venueUnknown` | The stop's venue is unknown, so the SDK did not read the price. |
 *  | `notLive` | The registry no longer holds the stop. It fired or was cancelled after the view's version. |
 *  | `chainUnavailable` | The client has no chain transport. `error` is the {@link NotConfiguredError}. |
 *  | `readFailed` | The registry read failed or did not answer in time. `error` says why. A live view reads it again, up to three times. |
 *
 * @category account views
 */
export type AccountStopLimitPrice =
  | { readonly status: "known"; readonly value: bigint }
  | { readonly status: "notApplicable" }
  | { readonly status: "pending" }
  | {
      readonly status: "unknown";
      readonly reason: "spotUnreadable" | "venueUnknown" | "notLive";
      readonly error: null;
    }
  | { readonly status: "unknown"; readonly reason: "chainUnavailable"; readonly error: NotConfiguredError }
  | { readonly status: "unknown"; readonly reason: "readFailed"; readonly error: RpcError | ContractRevertError };

/**
 *  One pending stop in an account view.
 *
 * @category account views
 */
export interface AccountStop {
  /** The row id: `<registry>_<orderIdRaw>`, lower-case. Unique on its chain. */
  readonly id: string;
  /** The stop registry that holds the stop, lower-case. */
  readonly registry: string;
  /** The indexer's market id. For a stop it is the pool address. */
  readonly market: string;
  /** The pool the stop places into, lower-case. */
  readonly pool: string;
  /** The registry's order id. Pass it to cancel the stop. */
  readonly orderIdRaw: bigint;
  /** The account that owns the stop, lower-case. */
  readonly owner: string;
  /** `true` when the order it places buys, `false` when it sells. */
  readonly isBid: boolean;
  /** The quantity, raw base units. */
  readonly quantity: bigint;
  /** The price that fires the stop, raw quote units per whole base. */
  readonly triggerPrice: bigint;
  /** `0` fires at or above the trigger price; `1` fires at or below it. */
  readonly triggerOperator: 0 | 1;
  /** `0` places a LIMIT order when the stop fires; `1` places a MARKET order. */
  readonly orderType: 0 | 1;
  /** The builder tagged on the order it places, lower-case. */
  readonly builder: string;
  /** The builder fee of the order it places, in basis points times 1000. */
  readonly builderFeeBpsTimes1k: bigint;
  /** Always `"PENDING"`: an account view holds pending stops only. */
  readonly status: "PENDING";
  /** The order a fired stop placed, or `null`. */
  readonly placedOrderId: bigint | null;
  /** Why a trigger placed nothing. The registry sets it only on a failed trigger, so a pending stop has `null`. */
  readonly dropReason: PerpStopDropReason | null;
  /** The other leg of a linked TP/SL pair, as its registry order id, or `null`. */
  readonly siblingOrderId: bigint | null;
  /** The row id of the other leg of a linked TP/SL pair, or `null`. The other leg is in the same registry. */
  readonly siblingId: string | null;
  /** What the order it places may do to a position, or `null` on spot. */
  readonly intent: PerpStopIntent | null;
  /** Why the stop was cancelled, or `null`. */
  readonly cancelReason: string | null;
  /** When the stop was created, in Unix seconds. */
  readonly createdAt: bigint;
  /** When the stop last changed, in Unix seconds. */
  readonly updatedAt: bigint;
  /** The transaction that created the stop. */
  readonly txHash: string;
  /** Which registry the stop belongs to. */
  readonly venue: AccountStopVenue;
  /** The limit price of the order the stop places. */
  readonly limitPrice: AccountStopLimitPrice;
}

/**
 *  The version an account view is complete at.
 *
 *  An account the producer never changed has the zero version: block `0n` with no
 *  hash and no digest. Compare versions only within one dataset generation.
 *
 * @category account views
 */
export interface AccountViewVersion {
  /** The indexer's dataset generation. A new generation is a new dataset. */
  readonly datasetGeneration: string;
  /** The block of the account's newest committed change. */
  readonly blockNumber: bigint;
  /** That block's hash, or `null` for the zero version. */
  readonly blockHash: string | null;
  /** The digest of that block's changes, or `null` for the zero version. */
  readonly digest: string | null;
}

/**
 *  How current an account view is.
 *
 *  A view is complete at its version. These fields say whether a newer version
 *  exists. They do not say how close the indexer is to the chain head, except
 *  `chainStopsBlock`, which says how far past its version a live view's stops reach.
 *
 * @category account views
 */
export interface AccountViewSync {
  /** Whether the view's version is the newest one the producer has published for the account. */
  readonly caughtUp: boolean;
  /** The newest guard block the SDK has seen for the account, or `null` when the account has none. */
  readonly latestGuardBlock: bigint | null;
  /** How far the indexer had processed the chain when the view was read. */
  readonly processedHeight: bigint;
  /**
   *  The newest block of a stop change a live view took from the chain, ahead of its
   *  version. `null` when the view's stops are the indexer's at its version. A snapshot
   *  the SDK reads has `null`; one that `getSnapshot` takes from a ready live view keeps
   *  that view's value.
   */
  readonly chainStopsBlock: bigint | null;
}

/**
 *  The producer declaration an orders view was read under: the indexer's contract and
 *  manifest, and the orders view's capacities.
 *
 * @category account views
 */
export interface AccountOrdersSource {
  /** The wire contract version. */
  readonly contractVersion: number;
  /** The digest of the manifest that declares the view's sources and limits. */
  readonly manifestDigest: string;
  /** The first block the producer publishes account changes for. */
  readonly changeStartBlock: bigint;
  /** The most open orders a view can hold. A larger account is `tooLarge`. */
  readonly orderCapacity: number;
  /** The most pending stops a view can hold. A larger account is `tooLarge`. */
  readonly stopCapacity: number;
}

/**
 *  A source the producer's manifest leaves out on purpose.
 *
 *  Orders and stops in an excluded source are unknown to the view, not absent. The
 *  texts are the producer's own words.
 *
 * @category account views
 */
export interface AccountViewExclusion {
  /** The source family, for example `"PERP_ORDER"`. */
  readonly family: string;
  /** What the family covers. */
  readonly covered: string;
  /** What the family leaves out. */
  readonly excluded: string;
  /** Where the producer records the decision. */
  readonly evidence: string;
}

/**
 *  What an account view's completeness covers.
 *
 *  `known` names the source families the manifest covers, for example `"SPOT_ORDER"`
 *  or `"PERP_STOP"`, and what the manifest leaves out of them. An order or stop outside
 *  a listed family, or in an excluded part of one, is unknown to the view, not absent.
 *
 *  The view can hold rows of a family it does not cover. The indexer returns an
 *  account's event-contract orders whether or not its manifest covers `"BINARY_ORDER"`,
 *  so an event-contract order in the view is real, but a missing one proves nothing
 *  until that family is listed.
 *
 *  `unknownManifest` means this SDK version does not know the manifest the producer
 *  serves, so it cannot say what is covered.
 *
 * @category account views
 */
export type AccountViewCoverage =
  | {
      readonly kind: "known";
      readonly manifestDigest: string;
      /** The source families the view's completeness covers, sorted. */
      readonly families: readonly string[];
      /** What the manifest leaves out of those families. An empty list means nothing. */
      readonly exclusions: readonly AccountViewExclusion[];
    }
  | { readonly kind: "unknownManifest"; readonly manifestDigest: string };

/**
 *  The contents of a ready account view.
 *
 * @category account views
 */
export interface AccountOrdersData {
  /** The open orders, sorted by id. */
  readonly orders: readonly AccountOrder[];
  /** The pending stops, sorted by id. */
  readonly stops: readonly AccountStop[];
  /** The version the view is complete at. */
  readonly version: AccountViewVersion;
  /** Whether a newer version exists. */
  readonly sync: AccountViewSync;
  /** What the completeness covers. */
  readonly coverage: AccountViewCoverage;
  /** Orders that expire before this nanosecond timestamp are not in the view. */
  readonly expiryCutoffNs: bigint;
  /** The producer declaration the view was read under. */
  readonly source: AccountOrdersSource;
  /** When the view was read, as a Unix time in milliseconds on this machine. */
  readonly observedAtMs: number;
}

/**
 *  Why the indexer cannot serve an account view on this chain.
 *
 *  | Reason | Means |
 *  | --- | --- |
 *  | `capabilityMissing` | The indexer does not serve account views here. |
 *  | `capabilityUnavailable` | The account view exists but is switched off; `detail` gives the producer's reason. |
 *  | `unsupportedContractVersion` | The indexer serves a wire contract this SDK version cannot read. |
 *  | `publicRoleLimitsUnproved` | The indexer has not proved the limits a complete read needs. |
 *  | `rebuildInProgress` | The indexer has not yet processed the blocks the view needs. |
 *
 * @category account views
 */
export type AccountViewUnavailableReason =
  | "capabilityMissing"
  | "capabilityUnavailable"
  | "unsupportedContractVersion"
  | "publicRoleLimitsUnproved"
  | "rebuildInProgress";

/**
 *  Why an account-view read failed. One code covers every error the account view
 *  throws; {@link accountViewFailureReason} maps a thrown error to it. The last three
 *  are the {@link AccountViewErrorReason} of an {@link AccountViewError}.
 *
 *  | Reason | Means |
 *  | --- | --- |
 *  | `invalidInput` | The scope or options are not valid. |
 *  | `notConfigured` | The client has no indexer endpoint, or its endpoint does not index this chain. |
 *  | `indexerUnavailable` | The SDK held the read back: the breaker is open, the queue is full, or `stopLive()` reset it. |
 *  | `requestFailed` | The request did not complete: a timeout, an HTTP error, or a GraphQL error. |
 *  | `invalidResponse` | The indexer answered with data that breaks the account-view contract. |
 *  | `scopeMismatch` | The indexer answered with data for another account, chain or dataset. |
 *  | `snapshotUnstable` | The account changed during every read attempt. Retry. |
 *
 * @category account views
 */
export type AccountViewFailureReason =
  | "invalidInput"
  | "notConfigured"
  | "indexerUnavailable"
  | "requestFailed"
  | AccountViewErrorReason;

/**
 *  An account's complete open orders and pending stops at one version.
 *
 * @category account views
 */
export interface AccountOrdersReady {
  readonly status: "ready";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result the engine produces, so a newer result has a larger one. */
  readonly revision: number;
  readonly data: AccountOrdersData;
}

/**
 *  The indexer cannot serve an account view on this chain. This is never an empty account.
 *
 * @category account views
 */
export interface AccountOrdersUnavailable {
  readonly status: "unavailable";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result the engine produces, so a newer result has a larger one. */
  readonly revision: number;
  readonly reason: AccountViewUnavailableReason;
  /** The producer's own reason, when it gave one. */
  readonly detail: string | null;
}

/**
 *  The account holds more orders or stops than a view can prove complete, or its
 *  response exceeded the indexer's byte limit.
 *
 *  Placing orders is not limited. Read such an account through the paged order reads,
 *  which do not claim completeness.
 *
 * @category account views
 */
export interface AccountOrdersTooLarge {
  readonly status: "tooLarge";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result the engine produces, so a newer result has a larger one. */
  readonly revision: number;
  /** Which limit the account exceeded. */
  readonly collection: "orders" | "stops" | "responseBytes";
  /** The limit: a row count, or a byte count for `responseBytes`. */
  readonly capacity: number;
  /**
   *  The earliest expiry among the orders read, or `null` when none expires.
   *
   *  When orders are over the limit, the account may fit again once they expire. Stops
   *  do not expire.
   */
  readonly earliestExpiryNs: bigint | null;
}

/**
 *  The result of {@link AccountOrdersClient.getSnapshot}: {@link AccountOrdersReady},
 *  {@link AccountOrdersUnavailable} or {@link AccountOrdersTooLarge}. Switch on `status`.
 *
 * @category account views
 */
export type AccountOrdersSnapshot = AccountOrdersReady | AccountOrdersUnavailable | AccountOrdersTooLarge;

/**
 *  A live view has no data yet: the SDK is reading the account's first snapshot.
 *
 * @category account views
 */
export interface AccountOrdersLoading {
  readonly status: "loading";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result the engine produces, so a newer result has a larger one. */
  readonly revision: number;
}

/**
 *  Why a live view shows data that may be out of date.
 *
 *  | Reason | Means |
 *  | --- | --- |
 *  | `reconnecting` | The live connection was lost, or the account's changes cannot be applied in order. The SDK reads a new snapshot. |
 *  | `refreshFailed` | The new snapshot failed. The SDK tries again after a backoff; `error` says why. |
 *  | `fellBehind` | Changes arrived faster than the SDK could apply them. The SDK reads a new snapshot. |
 *
 * @category account views
 */
export type AccountOrdersStaleReason = "reconnecting" | "refreshFailed" | "fellBehind";

/**
 *  An error a live view reports: a {@link AccountViewError}, an indexer request that did
 *  not complete, or a missing configuration.
 *
 * @category account views
 */
export type AccountOrdersViewError = AccountViewError | IndexerUnavailableError | IndexerError | NotConfiguredError;

/**
 *  A live view keeps its last complete data while it recovers.
 *
 *  The data was complete at `data.version`, but newer changes may be missing. Treat it as
 *  what the account looked like then, not as current.
 *
 * @category account views
 */
export interface AccountOrdersStale {
  readonly status: "stale";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result the engine produces, so a newer result has a larger one. */
  readonly revision: number;
  /** The last complete data. */
  readonly data: AccountOrdersData;
  readonly reason: AccountOrdersStaleReason;
  /** The error behind `refreshFailed`, or `null`. */
  readonly error: AccountOrdersViewError | null;
}

/**
 *  A live view has no data, because its read failed. It is never an empty account.
 *
 *  The SDK tries again after a backoff unless `retrying` is `false`, which means the
 *  failure needs a code or configuration fix.
 *
 * @category account views
 */
export interface AccountOrdersFailed {
  readonly status: "failed";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result the engine produces, so a newer result has a larger one. */
  readonly revision: number;
  /** The failure code of `error`. See {@link AccountViewFailureReason}. */
  readonly reason: AccountViewFailureReason;
  readonly error: AccountOrdersViewError;
  /** Whether the SDK tries again on its own. */
  readonly retrying: boolean;
}

/**
 *  A live orders view ended: `stopLive()` stopped it, or the client's `signal` aborted.
 *  No view follows. After `stopLive()`, call `subscribe` again for a new one.
 *
 * @category account views
 */
export interface AccountOrdersClosed {
  readonly status: "closed";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result the engine produces, so a newer result has a larger one. */
  readonly revision: number;
}

/**
 *  One state of a live view from {@link AccountOrdersClient.subscribe}. Switch on `status`.
 *
 *  | Status | Has data | Means |
 *  | --- | --- | --- |
 *  | `loading` | no | The first snapshot is being read. |
 *  | `ready` | yes | Complete at `data.version`, and the SDK applies every change as it arrives. |
 *  | `stale` | yes | The last complete data, while the SDK recovers. |
 *  | `failed` | no | The read failed. The SDK tries again unless `retrying` is `false`. |
 *  | `unavailable` | no | The indexer cannot serve an account view on this chain. The SDK watches for it to become available. |
 *  | `tooLarge` | no | The account holds more than the view can prove complete. The SDK checks again later. |
 *  | `closed` | no | The view ended. |
 *
 * @category account views
 */
export type AccountOrdersView =
  | AccountOrdersLoading
  | AccountOrdersReady
  | AccountOrdersStale
  | AccountOrdersFailed
  | AccountOrdersUnavailable
  | AccountOrdersTooLarge
  | AccountOrdersClosed;
