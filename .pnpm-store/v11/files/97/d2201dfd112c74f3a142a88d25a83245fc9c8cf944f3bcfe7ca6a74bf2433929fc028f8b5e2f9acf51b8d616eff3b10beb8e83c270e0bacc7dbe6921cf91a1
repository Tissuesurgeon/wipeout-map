// Public types of the perp positions view: what `client.accountPositions` returns.
//
// A positions view is one account's open perp positions and cross-margin state on one
// chain, read from the chain at one block. Every figure comes from the MarginBank and
// the perp pools, not from the indexer: the chain's own list of the account's pools is
// complete, and every mark-dependent figure only exists there. Protocol integers are
// `bigint` raw units (SDK-TYPE-007). Addresses stay lower-case strings, as the account
// view's other rows keep them.

import type { ContractRevertError, NotConfiguredError, RpcError } from "../errors.js";
import type { MarginStatus } from "../perp/margin.js";

/**
 *  Why a chain figure could not be read: the call reverted, or the read did not complete.
 *
 * @category account views
 */
export type AccountPositionsReadError = ContractRevertError | RpcError;

/**
 *  A figure the view read, or the reason it could not.
 *
 * @category account views
 */
export type AccountPositionsFigure<T> =
  | { readonly status: "known"; readonly value: T }
  | { readonly status: "unknown"; readonly reason: "readFailed"; readonly error: AccountPositionsReadError };

/**
 *  A position's mark-dependent figures, as the MarginBank computes them.
 *
 *  | Status | Means |
 *  | --- | --- |
 *  | `known` | The pool priced the position at the view's block. |
 *  | `unknown` `unpriceable` | The pool's mark feed is stale or zero, so nothing can be marked. The position is still open. |
 *  | `unknown` `readFailed` | The pool's price read failed. `error` says why. |
 *
 *  An unknown figure is never zero: a position nobody can price is not flat.
 *
 * @category account views
 */
export type AccountPositionMarks =
  | {
      readonly status: "known";
      /** The mark the position is priced at, raw quote units per whole base. */
      readonly markPrice: bigint;
      /** `|size| × mark`, raw collateral units. */
      readonly notional: bigint;
      /** PnL against the entry price, excluding funding, raw collateral units. Signed. */
      readonly unrealizedPnl: bigint;
      /**
       *  Funding the position OWES since entry, raw collateral units. Positive means the
       *  account pays; it is subtracted to reach `equityContribution`.
       */
      readonly accruedFunding: bigint;
      /** `unrealizedPnl − accruedFunding`: what the position adds to the account's equity. */
      readonly equityContribution: bigint;
      /** The position's share of the account's initial-margin requirement, at the market's rate. */
      readonly initialMarginRequirement: bigint;
      /** The position's share of the maintenance requirement. */
      readonly maintenanceMarginRequirement: bigint;
      /** The position's share of the close-out requirement. */
      readonly closeOutMarginRequirement: bigint;
      /** `equityContribution` over `initialMarginRequirement`, in bps, or `null` when there is no requirement. */
      readonly returnOnMarginBps: bigint | null;
    }
  | { readonly status: "unknown"; readonly reason: "unpriceable"; readonly error: null }
  | { readonly status: "unknown"; readonly reason: "readFailed"; readonly error: AccountPositionsReadError };

/**
 *  The mark at which the account would be liquidated, moving only this market's price.
 *
 *  | Status | Means |
 *  | --- | --- |
 *  | `known` | `value` is the price, raw quote units per whole base, or `null` when no price of this market alone liquidates the account. |
 *  | `unknown` `unpriceable` | This pool cannot be priced. |
 *  | `unknown` `healthUnreadable` | The account's health could not be read, for example because another market it holds cannot be priced. `error` says why. |
 *  | `unknown` `readFailed` | This pool's price read failed. `error` says why. |
 *
 * @category account views
 */
export type AccountPositionLiquidationPrice =
  | { readonly status: "known"; readonly value: bigint | null }
  | { readonly status: "unknown"; readonly reason: "unpriceable"; readonly error: null }
  | {
      readonly status: "unknown";
      readonly reason: "healthUnreadable" | "readFailed";
      readonly error: AccountPositionsReadError;
    };

/**
 *  One open perp position.
 *
 * @category account views
 */
export interface AccountPosition {
  /** The row id: `<pool>_<account>`, lower-case, as the indexer names a position. */
  readonly id: string;
  /** The perp pool, lower-case. */
  readonly pool: string;
  /** The MarginBank that holds the position, lower-case. */
  readonly marginBank: string;
  /** Signed size, raw base units: positive is long, negative is short. Never zero. */
  readonly size: bigint;
  /** Volume-weighted average entry price, raw quote units per whole base. */
  readonly avgEntryPrice: bigint;
  /** The cumulative funding index the position was last settled at, 1e18-scaled. */
  readonly entryFundingIndex: bigint;
  /** When the position last changed, in Unix nanoseconds. */
  readonly lastUpdatedTimestampNs: bigint;
  /** The account's leverage cap on this pool as a whole multiplier, `0` when it set none. */
  readonly leverageCap: AccountPositionsFigure<number>;
  readonly marks: AccountPositionMarks;
  readonly liquidationPrice: AccountPositionLiquidationPrice;
}

/**
 *  The account's cross-margin health in one MarginBank.
 *
 * @category account views
 */
export interface AccountMarginHealth {
  /** Collateral plus unrealized PnL minus owed funding, raw collateral units. Signed. */
  readonly equity: bigint;
  /** The initial-margin requirement across every market. */
  readonly imReq: bigint;
  /** The maintenance requirement across every market. */
  readonly mmReq: bigint;
  /** The close-out requirement across every market. */
  readonly cmReq: bigint;
}

/**
 *  The account's collateral and risk in one MarginBank.
 *
 *  The collateral balances come from the same read as the position list, so they are
 *  always present. The other figures are separate reads and can be unknown on their own:
 *  health, for example, fails while any market the account holds cannot be priced.
 *
 * @category account views
 */
export interface AccountMargin {
  /** The MarginBank, lower-case. */
  readonly marginBank: string;
  /** Collateral not locked by resting orders, raw collateral units. Signed: it can go negative. */
  readonly unlockedCollateralBalance: bigint;
  /** Collateral locked by resting orders, raw collateral units. */
  readonly lockedCollateral: bigint;
  readonly health: AccountPositionsFigure<AccountMarginHealth>;
  /** Collateral the account can withdraw now. */
  readonly withdrawable: AccountPositionsFigure<bigint>;
  readonly marginStatus: AccountPositionsFigure<MarginStatus>;
  /**
   *  The extra initial margin the account's leverage caps require beyond the markets'
   *  own rates, account-wide.
   */
  readonly leverageSurcharge: AccountPositionsFigure<bigint>;
}

/**
 *  One resting perp order of the account, as its pool stores it.
 *
 *  The pool keeps an order until it fills or someone cancels it, an expired one too:
 *  compare `expireTimestampNs` with the time to tell an order that can still fill.
 *
 * @category account views
 */
export interface AccountPerpOrder {
  /** The row id: `<pool>_<orderId>`, lower-case, as the indexer names an order. */
  readonly id: string;
  /** The perp pool, lower-case. */
  readonly pool: string;
  /** The pool's order id. */
  readonly orderId: bigint;
  /** `true` for a bid (buy), `false` for an ask (sell). */
  readonly isBid: boolean;
  /** The limit price, raw quote units per whole base. */
  readonly price: bigint;
  /** The quantity as placed, raw base units. */
  readonly fullQuantity: bigint;
  /** The quantity still resting, raw base units. */
  readonly quantityRemaining: bigint;
  /** The expiry, as a Unix time in nanoseconds. `0n` means none. */
  readonly expireTimestampNs: bigint;
  /** The caller's tag the pool echoes back. `0n` when unused. */
  readonly userData: bigint;
}

/**
 *  One account's perp positions and margin in one MarginBank, at one block.
 *
 * @category account views
 */
export interface AccountPositionsData {
  /** Every open position, sorted by id. */
  readonly positions: readonly AccountPosition[];
  /**
   *  The account's resting orders in the MarginBank's pools, sorted by id. `unknown`
   *  when one pool's orders could not be read: a shortened list is never shown.
   */
  readonly orders: AccountPositionsFigure<readonly AccountPerpOrder[]>;
  /** The account's collateral and risk in the MarginBank. */
  readonly margin: AccountMargin;
  /** The block every figure was read at. */
  readonly blockNumber: bigint;
  /** When the view was read, as a Unix time in milliseconds on this machine. */
  readonly observedAtMs: number;
}

/**
 *  One account's open perp positions and margin in one MarginBank, at one block. The
 *  result of {@link AccountPositionsClient.getSnapshot}, and the `ready` state of a live view.
 *
 * @category account views
 */
export interface AccountPositionsSnapshot {
  readonly status: "ready";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The MarginBank, lower-case. */
  readonly marginBank: string;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
  readonly data: AccountPositionsData;
}

/**
 *  An error a live positions view reports.
 *
 * @category account views
 */
export type AccountPositionsViewError = ContractRevertError | RpcError | NotConfiguredError;

/**
 *  A live positions view has no data yet: the SDK is reading the account for the first time.
 *
 * @category account views
 */
export interface AccountPositionsLoading {
  readonly status: "loading";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The MarginBank, lower-case. */
  readonly marginBank: string;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
}

/**
 *  Why a live positions view shows data that may be out of date.
 *
 *  | Reason | Means |
 *  | --- | --- |
 *  | `refreshFailed` | The last read failed. The SDK tries again after a backoff; `error` says why. |
 *  | `reconnecting` | The chain subscription that reports the account's changes was lost. The SDK subscribes again and reads the account. |
 *
 * @category account views
 */
export type AccountPositionsStaleReason = "refreshFailed" | "reconnecting";

/**
 *  A live positions view keeps its last data while it recovers. The data was right at
 *  `data.blockNumber`; newer changes may be missing.
 *
 * @category account views
 */
export interface AccountPositionsStale {
  readonly status: "stale";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The MarginBank, lower-case. */
  readonly marginBank: string;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
  /** The last data. */
  readonly data: AccountPositionsData;
  readonly reason: AccountPositionsStaleReason;
  /** The error behind `refreshFailed`, or `null`. */
  readonly error: AccountPositionsViewError | null;
}

/**
 *  A live positions view has no data, because its read failed. It is never an account
 *  with no positions.
 *
 *  The SDK tries again after a backoff unless `retrying` is `false`, which means the
 *  client has no chain transport.
 *
 * @category account views
 */
export interface AccountPositionsFailed {
  readonly status: "failed";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The MarginBank, lower-case. */
  readonly marginBank: string;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
  readonly error: AccountPositionsViewError;
  /** Whether the SDK tries again on its own. */
  readonly retrying: boolean;
}

/**
 *  A live positions view ended: `stopLive()` stopped it, or the client's `signal`
 *  aborted. No view follows. After `stopLive()`, call `subscribe` again for a new one.
 *
 * @category account views
 */
export interface AccountPositionsClosed {
  readonly status: "closed";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The MarginBank, lower-case. */
  readonly marginBank: string;
  /** The account, lower-case. */
  readonly account: string;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
}

/**
 *  One state of a live view from {@link AccountPositionsClient.subscribe}. Switch on `status`.
 *
 *  | Status | Has data | Means |
 *  | --- | --- | --- |
 *  | `loading` | no | The first read is in flight. |
 *  | `ready` | yes | Right at `data.blockNumber`, and refreshed as the account changes. |
 *  | `stale` | yes | The last data, while the SDK recovers. |
 *  | `failed` | no | The read failed. The SDK tries again unless `retrying` is `false`. |
 *  | `closed` | no | The view ended. |
 *
 * @category account views
 */
export type AccountPositionsView =
  | AccountPositionsLoading
  | AccountPositionsSnapshot
  | AccountPositionsStale
  | AccountPositionsFailed
  | AccountPositionsClosed;
