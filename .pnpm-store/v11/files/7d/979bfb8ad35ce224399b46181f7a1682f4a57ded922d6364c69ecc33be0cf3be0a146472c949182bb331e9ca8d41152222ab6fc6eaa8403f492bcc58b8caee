// The node's push of one account's perp positions, resting orders and margin.
//
// Somnia's `somnia_watch` subscription delivers each matched log WITH the results of
// calls the node runs at that log's block. Here the calls are the account read itself
// (`positionsRead.ts`): one Multicall3 `aggregate3` of the block number and every call of
// a read whose pools and orders are known, then one `getOwnOpenOrders` per pool, sent as
// the account because the pool answers for its caller. So each push is a complete
// one-block read, and the client makes no call of its own.
//
// Every subscription carries the same calls. The account's MarginBank events (a fill, an
// order's collateral lock or release, a deposit, a liquidation) push the state in the
// block it changes. Most of them name the account in topic 1, but some name it later:
// `PositionTransferred` names the receiver in topic 2, and `AutoDeleveraged` the bankrupt
// account in topic 3. A filter matches one topic position, so there is one subscription
// per position. The price feed's `PricesUpdated` pushes the state on every price write,
// because marks, PnL and liquidation prices move with the price even when the position
// does not.

import {
  decodeFunctionResult,
  encodeFunctionData,
  multicall3Abi,
  pad,
  parseAbi,
  toEventSelector,
  type Address,
  type Hex,
} from "viem";
import { RpcError } from "../errors.js";
import * as Raise from "../raise.js";
import type * as PinnedBatch from "./pinnedBatch.js";
import * as PoolOrders from "./poolOrders.js";
import * as PositionsRead from "./positionsRead.js";

/**
 *  topic0 of the price feed's `PricesUpdated` event. The price agents write every
 *  symbol in one transaction, about once a second, and the feed emits it each time.
 */
export const PRICES_UPDATED_TOPIC: Hex = toEventSelector(
  "PricesUpdated(uint256,uint256,uint256[],uint256[],uint256[],uint256[],uint256)",
);

const blockNumberAbi = parseAbi(["function getBlockNumber() view returns (uint256 blockNumber)"]);

/** One `somnia_watch` subscription: the logs that trigger a push, and the calls it carries. */
export interface PushRequest {
  /** The contracts whose logs trigger a push. */
  readonly address: readonly Address[];
  /** The topic filter, position by position. `null` matches any value. */
  readonly topics: readonly (Hex | null)[];
  /** The calls the node runs at the block of each matched log. `from` sends a call as that address. */
  readonly ethCalls: readonly { readonly from?: Address; readonly to: Address; readonly data: Hex }[];
}

/** Why a push ended: the node refused the subscription, or it was lost after it opened. */
export type PushEnd = "rejected" | "lost";

/**
 *  Opens one `somnia_watch` subscription and returns its release. `onResults` receives
 *  each push's call results, in the order of `ethCalls`. `onOpen` fires once, when the
 *  node confirms the subscription. `onEnd` fires at most once.
 */
export type WatchPushes = (
  request: PushRequest,
  onResults: (results: readonly Hex[]) => void,
  onEnd: (end: PushEnd) => void,
  onOpen: () => void,
) => () => void;

/** The topic positions that can name the account in a MarginBank event. */
const ACCOUNT_TOPIC_POSITIONS = [1, 2, 3] as const;

/** What one push says. */
export type PushOutcome =
  | { readonly kind: "read"; readonly read: PositionsRead.AccountPositionsRead }
  /** A bank lists a pool the push does not read, so only a full read is complete. */
  | { readonly kind: "poolsChanged" }
  /** A pool lists an order whose details the push does not read, so only a full read is complete. */
  | { readonly kind: "ordersChanged" }
  /** The read failed as a read can: the account state or a position is unreadable. */
  | { readonly kind: "failed"; readonly error: unknown }
  /** The results are not what the calls return. */
  | { readonly kind: "malformed" };

/** The one call a push carries: the block number, then the read's `members`. */
export function pushCallOf(
  multicall: Address,
  members: readonly { readonly target: Address; readonly callData: Hex }[],
): { readonly to: Address; readonly data: Hex } {
  const blockNumber = {
    target: multicall,
    callData: encodeFunctionData({ abi: blockNumberAbi, functionName: "getBlockNumber" }),
  };
  const calls = [blockNumber, ...members].map(({ target, callData }) => ({ target, allowFailure: true, callData }));
  return { to: multicall, data: encodeFunctionData({ abi: multicall3Abi, functionName: "aggregate3", args: [calls] }) };
}

/** The calls a push carries for `input`, and how many read members ride its `aggregate3`. */
export function pushCallsOf(
  input: PositionsRead.ReadAccountPositionsInput,
  multicall: Address,
): { readonly ethCalls: PushRequest["ethCalls"]; readonly members: number } {
  const members = PositionsRead.knownPoolCalls(input, multicall);
  const orderIds = PositionsRead.knownPoolList(input).map(({ pool }) => ({
    from: input.account,
    to: pool,
    data: PoolOrders.OWN_OPEN_ORDERS_CALL_DATA,
  }));
  return { ethCalls: [pushCallOf(multicall, members), ...orderIds], members: members.length };
}

/**
 *  Reads one push's results: the `aggregate3`, then one order id list per known pool.
 *  `members` is the number of read calls the `aggregate3` carries after the block number.
 *
 *  An id list that does not decode makes that pool's orders unknown, not the push
 *  malformed: a pool can refuse one call the way a member can fail.
 */
export function outcomeOf(
  input: PositionsRead.ReadAccountPositionsInput,
  members: number,
  results: readonly Hex[],
): PushOutcome {
  const pools = PositionsRead.knownPoolList(input);
  const [data, ...idResults] = results;
  if (results.length !== pools.length + 1 || data === undefined) return { kind: "malformed" };
  let decoded: readonly { readonly success: boolean; readonly returnData: Hex }[];
  let blockNumber: bigint;
  try {
    decoded = decodeFunctionResult({ abi: multicall3Abi, functionName: "aggregate3", data });
    const head = decoded[0];
    if (head === undefined || !head.success || decoded.length !== members + 1) return { kind: "malformed" };
    blockNumber = decodeFunctionResult({ abi: blockNumberAbi, functionName: "getBlockNumber", data: head.returnData });
  } catch {
    return { kind: "malformed" };
  }
  const ids = new Map<string, PinnedBatch.Settled<readonly bigint[]>>();
  pools.forEach(({ key }, index) => {
    const raw = idResults[index] ?? Raise.unreachable("the number of results was checked above");
    try {
      ids.set(key, { ok: true, value: PoolOrders.decodeOwnOpenOrders(raw) });
    } catch (cause) {
      ids.set(key, { ok: false, error: new RpcError("getOwnOpenOrders", "the push carried no order ids", { cause }) });
    }
  });
  try {
    const read = PositionsRead.readFromResults(input, decoded.slice(1), ids, blockNumber);
    return read.kind === "read" ? { kind: "read", read: read.read } : { kind: read.kind };
  } catch (error) {
    return { kind: "failed", error };
  }
}

/** The account and pools a push reads, and what triggers it. */
export interface PushTarget {
  readonly account: Address;
  readonly marginBank: Address;
  /** The pools per bank that the push reads: the last read's. */
  readonly pools: ReadonlyMap<string, readonly Address[]>;
  /** The order ids per pool whose details the push reads: the last read's. */
  readonly orderIds: ReadonlyMap<string, readonly bigint[]>;
  /** The Multicall3 that runs the read. */
  readonly multicall: Address;
  /** The price feed whose updates trigger a push. `undefined` pushes on the account's events only. */
  readonly priceFeed: Address | undefined;
}

export interface PushHandlers {
  /** The node confirmed every subscription: from now on, each change pushes. */
  onOpen(): void;
  onRead(read: PositionsRead.AccountPositionsRead): void;
  /** A push listed a pool or an order the target does not read: only a full read is complete. */
  onNeedsRead(): void;
  /** A push carried a read that failed. */
  onReadFailed(error: unknown): void;
  /** The push ended. Fires at most once, and nothing follows it. */
  onEnd(end: PushEnd): void;
}

/**
 *  Opens the pushes of one account's state and returns the release. Calling it twice
 *  does nothing, and nothing follows it.
 *
 *  Results that are not what the calls return end the push as `rejected`: a node that
 *  answers so would answer so again, so the caller reads instead of retrying. When one
 *  subscription throws as it opens, the ones already open are released and the error
 *  is thrown on.
 */
export function openPush(target: PushTarget, watch: WatchPushes, handlers: PushHandlers): () => void {
  const input = {
    account: target.account,
    marginBanks: [target.marginBank],
    knownPools: target.pools,
    knownOrders: target.orderIds,
  };
  const { ethCalls, members } = pushCallsOf(input, target.multicall);
  let ended = false;
  const releases: (() => void)[] = [];
  const release = (): void => {
    ended = true;
    for (const each of releases.splice(0)) each();
  };
  const end = (why: PushEnd): void => {
    if (ended) return;
    release();
    handlers.onEnd(why);
  };
  const onResults = (results: readonly Hex[]): void => {
    if (ended) return;
    const outcome = outcomeOf(input, members, results);
    switch (outcome.kind) {
      case "read":
        handlers.onRead(outcome.read);
        return;
      case "poolsChanged":
      case "ordersChanged":
        handlers.onNeedsRead();
        return;
      case "failed":
        handlers.onReadFailed(outcome.error);
        return;
      case "malformed":
        end("rejected");
        return;
    }
  };
  const account = pad(target.account, { size: 32 });
  const requests: PushRequest[] = ACCOUNT_TOPIC_POSITIONS.map((position) => ({
    address: [target.marginBank],
    topics: [...Array.from({ length: position }, () => null), account],
    ethCalls,
  }));
  if (target.priceFeed !== undefined) {
    requests.push({ address: [target.priceFeed], topics: [PRICES_UPDATED_TOPIC], ethCalls });
  }
  let unconfirmed = requests.length;
  const confirmed = (): void => {
    unconfirmed -= 1;
    if (unconfirmed === 0 && !ended) handlers.onOpen();
  };
  for (const request of requests) {
    let opened = false;
    let releaseOne: () => void;
    try {
      releaseOne = watch(request, onResults, end, () => {
        if (opened) return;
        opened = true;
        confirmed();
      });
    } catch (error) {
      // The subscriptions already open would outlive a push that never opened.
      release();
      throw error;
    }
    // A subscription can end during the call that opens it.
    if (ended) {
      releaseOne();
      break;
    }
    releases.push(releaseOne);
  }
  return release;
}
