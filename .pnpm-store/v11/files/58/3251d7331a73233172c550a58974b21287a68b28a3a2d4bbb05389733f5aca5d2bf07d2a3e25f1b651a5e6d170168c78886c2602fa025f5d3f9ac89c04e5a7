// Public types of the ADL queue view: what `client.perpAdlQueue` returns.
//
// An ADL queue view is one side of one perp market's auto-deleveraging queue on one
// chain, read from the chain at one block (`adl.ts`), and followed live from the
// market's MarginBank events (`adlSession.ts`). Its states are the account views'
// states (`../accountView/balancesTypes.ts`). Addresses stay lower-case strings, as the
// account views keep them.

import type { ContractRevertError, NotConfiguredError, RpcError } from "../errors.js";
import type { PerpAdlQueue } from "./adl.js";

/**
 *  One side of one perp market's ADL queue at one block.
 *
 * @category perpetual markets
 */
export interface PerpAdlQueueData {
  readonly queue: PerpAdlQueue;
  /** The block every figure was read at. */
  readonly blockNumber: bigint;
  /** When the view was read, as a Unix time in milliseconds on this machine. */
  readonly observedAtMs: number;
}

/**
 *  One side of one perp market's ADL queue at one block. The result of
 *  {@link PerpAdlQueueClient.getSnapshot}, and the `ready` state of a live view.
 *
 * @category perpetual markets
 */
export interface PerpAdlQueueSnapshot {
  readonly status: "ready";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The MarginBank, lower-case. */
  readonly marginBank: string;
  /** The perp pool, lower-case. */
  readonly pool: string;
  /** `true` for the long side, `false` for the short side. */
  readonly isLong: boolean;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
  readonly data: PerpAdlQueueData;
}

/**
 *  Why a live ADL queue view could not read: a read reverted or did not complete, or
 *  the client has no chain transport.
 *
 * @category perpetual markets
 */
export type PerpAdlQueueViewError = ContractRevertError | RpcError | NotConfiguredError;

/**
 *  A live ADL queue view has no data yet: the SDK is reading the side for the first time.
 *
 * @category perpetual markets
 */
export interface PerpAdlQueueLoading {
  readonly status: "loading";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The MarginBank, lower-case. */
  readonly marginBank: string;
  /** The perp pool, lower-case. */
  readonly pool: string;
  /** `true` for the long side, `false` for the short side. */
  readonly isLong: boolean;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
}

/**
 *  Why a live ADL queue view is `stale`.
 *
 *  | Reason | Means |
 *  | --- | --- |
 *  | `refreshFailed` | The last read failed. The SDK tries again after a backoff, and events that arrive meanwhile wait for it; `error` says why. |
 *  | `reconnecting` | The chain subscription that reports the market's MarginBank events was lost, and the node has not confirmed a new one. A read that lands meanwhile updates the data, but a change is not followed until the subscription is back. The SDK subscribes again and reads the side. |
 *
 * @category perpetual markets
 */
export type PerpAdlQueueStaleReason = "refreshFailed" | "reconnecting";

/**
 *  A live ADL queue view keeps its last data while it recovers. The data was right at
 *  `data.blockNumber`; newer changes may be missing.
 *
 * @category perpetual markets
 */
export interface PerpAdlQueueStale {
  readonly status: "stale";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The MarginBank, lower-case. */
  readonly marginBank: string;
  /** The perp pool, lower-case. */
  readonly pool: string;
  /** `true` for the long side, `false` for the short side. */
  readonly isLong: boolean;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
  /** The last data. */
  readonly data: PerpAdlQueueData;
  readonly reason: PerpAdlQueueStaleReason;
  /** The error behind `refreshFailed`, or `null`. */
  readonly error: PerpAdlQueueViewError | null;
}

/**
 *  A live ADL queue view has no data, because its read failed. It is never an empty
 *  queue.
 *
 *  The SDK tries again after a backoff unless `retrying` is `false`, which means the
 *  client has no chain transport.
 *
 * @category perpetual markets
 */
export interface PerpAdlQueueFailed {
  readonly status: "failed";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The MarginBank, lower-case. */
  readonly marginBank: string;
  /** The perp pool, lower-case. */
  readonly pool: string;
  /** `true` for the long side, `false` for the short side. */
  readonly isLong: boolean;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
  readonly error: PerpAdlQueueViewError;
  /** Whether the SDK tries again on its own. */
  readonly retrying: boolean;
}

/**
 *  A live ADL queue view ended: `stopLive()` stopped it, or the client's `signal`
 *  aborted. No view follows. After `stopLive()`, call `subscribe` again for a new one.
 *
 * @category perpetual markets
 */
export interface PerpAdlQueueClosed {
  readonly status: "closed";
  /** The chain the view is on. */
  readonly chainId: number;
  /** The MarginBank, lower-case. */
  readonly marginBank: string;
  /** The perp pool, lower-case. */
  readonly pool: string;
  /** `true` for the long side, `false` for the short side. */
  readonly isLong: boolean;
  /** A number that grows with every result this capability produces, so a newer result has a larger one. */
  readonly revision: number;
}

/**
 *  One state of a live view from {@link PerpAdlQueueClient.subscribe}. Switch on `status`.
 *
 *  | Status | Has data | Means |
 *  | --- | --- | --- |
 *  | `loading` | no | The first read is in flight. |
 *  | `ready` | yes | Right at `data.blockNumber`, and read again when the market's MarginBank reports a change. |
 *  | `stale` | yes | The last data, while the SDK recovers. |
 *  | `failed` | no | The read failed. The SDK tries again unless `retrying` is `false`. |
 *  | `closed` | no | The view ended. |
 *
 * @category perpetual markets
 */
export type PerpAdlQueueView =
  | PerpAdlQueueLoading
  | PerpAdlQueueSnapshot
  | PerpAdlQueueStale
  | PerpAdlQueueFailed
  | PerpAdlQueueClosed;
