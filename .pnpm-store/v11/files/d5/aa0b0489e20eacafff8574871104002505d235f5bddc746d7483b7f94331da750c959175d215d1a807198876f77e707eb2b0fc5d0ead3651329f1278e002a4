import type { Address, Hash, Hex } from "viem";
import type { BridgeToken, BridgeTransfer } from "./chains/bridge/types.js";
/**
 *  Base class for every error the SDK raises.
 *
 *  **When to use**
 *
 *  Use when you want "anything the SDK itself rejected" without enumerating
 *  subclasses — typically an application's top-level boundary. To branch on
 *  *what went wrong*, catch (or `instanceof`-test) the subclass instead; each
 *  one documents the action it implies.
 *
 *  **Gotchas**
 *
 *  Catching this is not the same as catching everything. Errors from a
 *  `walletClient` supplied by the app can surface as-is, so keep an
 *  `else throw e` arm. Debug sink failures are contained and do not escape.
 *
 * **Example** (Branching on SDK errors)
 *
 *  ```ts
 *  import { SomniaMarketsError, ContractRevertError } from "@somnia-chain/markets-sdk";
 *
 *  try {
 *    await exchange.createOrder("BTC-95000-31DEC26/USDC#YES", "limit", "buy", 10, 0.62);
 *  } catch (e) {
 *    if (e instanceof ContractRevertError) console.error("chain rejected:", e.errorName);
 *    else if (e instanceof SomniaMarketsError) console.error("sdk:", e.message);
 *    else throw e;
 *  }
 *  ```
 *
 * @category errors
 */
export declare class SomniaMarketsError extends Error {
    constructor(message: string, options?: ErrorOptions);
}
/**
 * @internal Classify the finite SDK vocabulary without inspecting arbitrary values.
 * Invariant's genuine class is supplied privately to avoid an errors/raise runtime cycle.
 */
export declare function sdkFailure(caught: unknown, Invariant: typeof import("./raise.js").InvariantError): import("./config.js").SomniaMarketsSocketFailure | undefined;
/**
 * Internal error discrimination for owned mapping seams. A thrown value can be
 * a Proxy whose prototype lookup fails; that failure must not replace the value
 * being normalized or prevent rejection-time provenance from being recorded.
 */
export declare function isErrorInstance<T extends SomniaMarketsError>(value: unknown, errorClass: abstract new (...args: never[]) => T): value is T;
/**
 *  The call itself was wrong — a bad argument, an unknown symbol, or a method
 *  used against the wrong kind of market. Thrown *before* any network round-trip.
 *
 *  **Details**
 *
 *  This says the *caller* is at fault, in contrast to {@link NotConfiguredError}
 *  (the client is missing a config value) and {@link ContractRevertError} (the
 *  call was well-formed but the chain rejected it).
 *
 *  **Gotchas**
 *
 *  Never retry this. The arguments are wrong, so the same call fails the same
 *  way forever — fix the input instead of backing off.
 *
 * @category errors
 */
export declare class InvalidInputError extends SomniaMarketsError {
    /**
     *  The chain ids of a call that named no chain, or named two chains that do
     *  not agree. Set by `exchange.client` and `exchange.trader` on a multi-chain
     *  exchange (the chains it spans) and by `createReactivity` (the engine's
     *  chain, then the wallet's). Absent on every other input error.
     */
    readonly chainIds?: readonly number[];
    /**
     * Creates an invalid-input error with an optional underlying cause.
     *
     * **Details**
     *
     * - `message`: What was wrong with the input.
     * - `options`: Standard `cause` passthrough, plus `chainIds` when the fault is a chain choice.
     */
    constructor(message: string, options?: ErrorOptions & {
        chainIds?: readonly number[];
    });
}
/**
 * A fill continuation belongs to a different serving dataset. Discard all
 * accumulated pages and call `getUserFillsPage` again without a cursor.
 *
 * @category errors
 */
export declare class FillHistoryRestartRequiredError extends SomniaMarketsError {
    readonly cursorGeneration: string;
    readonly servingGeneration: string;
    constructor(cursorGeneration: string, servingGeneration: string);
}
/**
 * The serving indexer has not initialized its fill-history dataset contract.
 * Deploy and reindex a compatible producer before reading historical pages.
 *
 * @category errors
 */
export declare class FillHistoryUnavailableError extends SomniaMarketsError {
    readonly operation: string;
    constructor(operation: string, options?: ErrorOptions);
}
/**
 * The serving indexer does not serve perp position changes: it predates the
 * `PerpPositionChange` table. Reindex it with a compatible producer before
 * pairing fills with their position updates. Until then, show a fill's own side.
 *
 * @category errors
 */
export declare class PerpPositionChangesUnavailableError extends SomniaMarketsError {
    readonly operation: string;
    constructor(operation: string, options?: ErrorOptions);
}
/**
 *  The feature needs a contract address (or URL) that this client wasn't given.
 *
 *  **Details**
 *
 *  The SDK degrades by feature rather than refusing to construct: most
 *  {@link SomniaMarketsAddresses} entries are optional, and the methods that
 *  need one throw this when it's absent.
 *
 *  **Gotchas**
 *
 *  Because construction succeeds, a missing address surfaces at the first call
 *  that needs it rather than at `new SomniaMarkets(…)` — so a feature can look
 *  wired up until it's exercised. The fix is always config-side (pass the
 *  address, or the method's own override param), never a retry.
 *
 * @category errors
 */
export declare class NotConfiguredError extends SomniaMarketsError {
    readonly what: string;
    /**
     * Creates a missing-configuration error for one operation.
     *
     * **Details**
     *
     * - `what`: The config key or contract the operation needs (e.g. `"addresses.oracleHub"`).
     * - `detail`: What was being attempted, and how to supply it.
     */
    constructor(what: string, detail: string);
}
/**
 *  The call is valid, but this SDK version does not support it yet. Thrown
 *  before any network round-trip. Do not retry: use a supported option, or
 *  upgrade the SDK.
 *
 * @category errors
 */
export declare class NotSupportedError extends SomniaMarketsError {
    readonly feature: string;
    /**
     * Creates a not-supported error for one feature.
     *
     * **Details**
     *
     * - `feature`: The unsupported feature (e.g. `'getAccountEquity scope "spot"'`).
     */
    constructor(feature: string);
}
/**
 *  An authenticated (writing) method was called on a read-only client.
 *
 *  **Details**
 *
 *  Construct the exchange with a `privateKey`, an `account`, or a
 *  `walletClient` to unlock writes. Distinct from {@link NotConfiguredError}:
 *  nothing is missing from the *addresses*, the client simply has no signer.
 *
 * @category errors
 */
export declare class SignerRequiredError extends SomniaMarketsError {
    readonly operation: string;
    readonly guidance: string;
    /**
     * Creates a signer-required error for one authenticated operation.
     *
     * **Details**
     *
     * - `operation`: The method that needs a signer (e.g. `"createOrder"`).
     * - `guidance`: What would satisfy it, when the default ("construct SomniaMarkets
     *   with a signer") is not the fix — a trader whose executor cannot sign typed
     *   data needs a different executor, not a different root. Kept on the error
     *   as `guidance` so a caller can branch on it without parsing the message.
     */
    constructor(operation: string, guidance?: string);
}
/**
 *  An indexer (Hasura/Envio GraphQL) request did not complete.
 *
 *  **When to use**
 *
 *  Use when opting into graceful degradation — this is the error to catch to
 *  serve stale or empty UI instead of failing a page. It is safe to treat as
 *  transient-or-misconfigured: endpoint down, bad URL, schema drift, timeout.
 *
 *  **Gotchas**
 *
 *  This ALWAYS means "the read didn't happen" — never "there is no such row".
 *  A point read that finds nothing resolves to `null` and a list read to `[]`;
 *  both are successful reads. Treating this as "not found" will hide an outage
 *  behind an empty state.
 *
 * **Example** (Falling back after an indexer failure)
 *
 *  ```ts
 *  import { IndexerError } from "@somnia-chain/markets-sdk";
 *
 *  const markets = await exchange.client
 *    .listBinaryMarkets()
 *    .catch((e) => { if (e instanceof IndexerError) return []; throw e; });
 *  ```
 *
 * @category errors
 */
export declare class IndexerError extends SomniaMarketsError {
    readonly operation: string;
    /**
     *  The chain whose read failed. Set only on an exchange with two or more
     *  chains, in two cases. The account reads of `SomniaMarkets`
     *  (`fetchBalance`, `fetchOpenOrders`, `fetchOrders`, `getOrdersPage`,
     *  `getOrderHistoryPage`, `fetchMyTrades`, `fetchPositions`,
     *  `fetchOpenStopOrders`, `watchUser`) set it when the read spans more than
     *  one chain, or when the read has no market and no chain filter, also if it
     *  then touches only one chain. `fetchDataStatus` sets it on the error it
     *  throws when every chain fails. {@link AccountViewError} always sets it.
     *  Absent on every other indexer error.
     */
    readonly chainId?: number;
    /**
     * Creates an indexer error with operation context and an optional cause.
     *
     * **Details**
     *
     * - `operation`: GraphQL operation name that failed (e.g. `"listBinaryMarkets"`).
     * - `detail`: Why it failed (HTTP status, GraphQL error message, "empty response").
     * - `options`: Standard `cause` passthrough — the underlying fetch/GraphQL failure — plus `chainId` when the failing chain is known.
     */
    constructor(operation: string, detail: string, options?: ErrorOptions & {
        chainId?: number;
    });
}
/**
 * Indexed history was not fully traversed, so portfolio analytics cannot be
 * computed without a misleading cost basis.
 *
 * Increase or omit `maxFillPages` for `pageBudgetExceeded`. A `cursorCycle`
 * means the indexer's pagination did not advance; retry or investigate its
 * dataset before displaying analytics. Neither outcome is an empty portfolio.
 *
 * @category errors
 */
export declare class IncompleteHistoryError extends SomniaMarketsError {
    /** The owner method that requires complete indexed history. */
    readonly operation: string;
    /** The action a caller must take before analytics can be trusted. */
    readonly reason: "pageBudgetExceeded" | "cursorCycle";
    /** Successful fill pages read before rejecting the incomplete result. */
    readonly pagesRead: number;
    /** Configured page budget, when the caller supplied one. */
    readonly maxFillPages?: number;
    constructor(operation: string, reason: "pageBudgetExceeded" | "cursorCycle", pagesRead: number, maxFillPages?: number);
}
/**
 * A complete claimable read exceeded its bounded position page. Use
 * `client.getClaimablePage` and follow its raw-position `nextOffset` instead.
 * The indexer answered successfully; retrying the same unqualified read cannot
 * recover the omitted rows.
 *
 * @category errors
 */
export declare class IncompletePortfolioError extends SomniaMarketsError {
    readonly account: string;
    readonly limit: number;
    readonly nextOffset: number;
    /** Creates a refusal carrying the account and bounded page that was inspected. */
    constructor(account: string, limit: number, nextOffset: number);
}
/**
 *  The indexer did not reach a requested block before the wait's deadline.
 *
 *  **When to use**
 *
 *  Catch it to decide what to do about LAG. The read itself worked: the indexer
 *  answered every poll and is simply behind, so the choices are to wait longer,
 *  to show the caller that the data is not there yet, or to read the same fact
 *  from chain instead. `latestProcessedBlock` says how far it had got, so the
 *  decision can be made on the size of the gap rather than on the timeout alone.
 *
 *  **Gotchas**
 *
 *  This is NOT an {@link IndexerError}: the indexer was reachable throughout.
 *  A request that failed to complete during the wait surfaces as
 *  {@link IndexerError}, and a chain the indexer serves no metadata row for
 *  does too — neither is cured by waiting.
 *
 * **Example** (Falling back to chain when the index is behind)
 *
 *  ```ts
 *  import { IndexerWaitTimeoutError } from "@somnia-chain/markets-sdk";
 *
 *  try {
 *    await exchange.client.waitForIndexedBlock(exchange.client.config.chain.id, receipt.blockNumber);
 *  } catch (e) {
 *    if (!(e instanceof IndexerWaitTimeoutError)) throw e;
 *    console.warn(`indexer is ${e.targetBlock - (e.latestProcessedBlock ?? 0)} blocks behind`);
 *  }
 *  ```
 *
 * @category errors
 */
export declare class IndexerWaitTimeoutError extends SomniaMarketsError {
    readonly targetBlock: number;
    readonly latestProcessedBlock: number | null;
    readonly timeoutMs: number;
    readonly waitedMs: number;
    readonly polls: number;
    /**
     * Creates a wait-timeout error carrying the observation that ran out of time.
     *
     * **Details**
     *
     * - `targetBlock`: Block the caller waited for.
     * - `latestProcessedBlock`: Last height the indexer reported, or `null` when it
     *   reported a chain row that had processed nothing.
     * - `timeoutMs`: Deadline the wait was given.
     * - `waitedMs`: Time actually spent waiting.
     * - `polls`: Number of metadata reads performed.
     */
    constructor(targetBlock: number, latestProcessedBlock: number | null, timeoutMs: number, waitedMs: number, polls: number);
}
/**
 *  A JSON-RPC / WebSocket request to the node did not complete, or the node
 *  refused a transaction.
 *
 *  **Details**
 *
 *  For a read, the request produced no chain answer (connection refused,
 *  timeout, unsupported method, subscription dropped). For a write, the node
 *  can also have answered with a refusal (nonce too low, insufficient funds).
 *
 *  **Gotchas**
 *
 *  A call that *did* reach the chain and was rejected by a contract is a
 *  {@link ContractRevertError} instead. Check for that first when branching.
 *
 *  A write whose signed transaction may already be on the node throws the
 *  subclass {@link TransactionOutcomeUnknownError}. Test for it before this
 *  class: sending that write again can execute it twice.
 *
 *  From the local-signer and session-key executors, a plain `RpcError` means
 *  the node refused the transaction or nothing was sent. Other writes do not
 *  guarantee this: a wallet client can fail after it broadcast, and admin,
 *  lend and bridge writes do not make the distinction yet. After one of those
 *  throws `RpcError`, check the chain before you send again.
 *
 * @category errors
 */
export declare class RpcError extends SomniaMarketsError {
    readonly operation: string;
    /**
     *  The chain whose read failed. Set only on an exchange with two or more
     *  chains, in two cases. The account reads of `SomniaMarkets`
     *  (`fetchBalance`, `fetchOpenOrders`, `fetchOrders`, `getOrdersPage`,
     *  `getOrderHistoryPage`, `fetchMyTrades`, `fetchPositions`,
     *  `fetchOpenStopOrders`, `watchUser`) set it when the read spans more than
     *  one chain, or when the read has no market and no chain filter, also if it
     *  then touches only one chain. `fetchDataStatus` sets it on the error it
     *  throws when every chain fails. Absent on every other RPC error.
     */
    readonly chainId?: number;
    /**
     * Creates an RPC error with operation context and an optional cause.
     *
     * **Details**
     *
     * - `operation`: What was attempted (e.g. `"eth_sendRawTransaction"`, `"watchBook"`).
     * - `detail`: Why it failed.
     * - `options`: Standard `cause` passthrough — the underlying viem/transport error — plus `chainId` when the failing chain is known.
     */
    constructor(operation: string, detail: string, options?: ErrorOptions & {
        chainId?: number;
    });
}
/**
 *  A write signed a transaction that may have reached the node, and the SDK
 *  did not observe its receipt. The transaction can still mine.
 *
 *  **When to use**
 *
 *  Catch this before {@link RpcError} on every write. Do not send the same
 *  write again until you know what happened to `hash`: read its receipt, or
 *  read the state the write changes (for an order, your open orders at chain
 *  head). A blind retry can place the order twice.
 *
 *  **Details**
 *
 *  The built-in executors throw it when the send left the SDK and then the
 *  answer was lost: the realtime send timed out or its socket dropped, or the
 *  receipt wait after `eth_sendRawTransaction` or a wallet's `sendTransaction`
 *  failed, reached its 60-second confirmation deadline, or was stopped by the
 *  owner. A supplied abort reason stays in `cause`. A refusal the node answered (nonce too low, insufficient funds, a
 *  revert) is a plain {@link RpcError} or a {@link ContractRevertError}.
 *
 *  - `chainId`: the chain the transaction was sent on.
 *  - `operation`: the request whose answer was lost (e.g. `"eth_sendRawTransactionSync"`).
 *  - `hash`: the transaction hash. Absent only when the protocol gives none
 *    before the receipt, as with `somnia_sendSessionTransaction`. Then read the
 *    state the write changes instead.
 *
 *  It extends {@link RpcError}, so an existing `instanceof RpcError` arm still
 *  catches it.
 *
 * **Example** (Looking up the hash before sending again)
 *
 *  ```ts
 *  import { TransactionOutcomeUnknownError } from "@somnia-chain/markets-sdk";
 *
 *  try {
 *    await exchange.trader.placeOrder(params);
 *  } catch (e) {
 *    if (!(e instanceof TransactionOutcomeUnknownError)) throw e;
 *    const viem = exchange.client.getViemClient();
 *    const receipt = e.hash ? await viem.getTransactionReceipt({ hash: e.hash }).catch(() => null) : null;
 *    if (receipt === null) {
 *      // Unknown still: read your open orders at chain head before placing again.
 *    }
 *  }
 *  ```
 *
 * @category errors
 */
export declare class TransactionOutcomeUnknownError extends RpcError {
    /** The chain the transaction was sent on. */
    readonly chainId: number;
    /** The transaction hash; absent only when the protocol returns none before the receipt. */
    readonly hash?: `0x${string}`;
    /**
     * Creates an outcome-unknown error.
     *
     * **Details**
     *
     * - `fields.chainId`: The chain the transaction was sent on.
     * - `fields.operation`: The request whose answer was lost.
     * - `fields.hash`: The signed transaction's hash, when the protocol gives one.
     * - `options`: Standard `cause` passthrough — the transport error that lost the answer.
     */
    constructor(fields: {
        chainId: number;
        operation: string;
        hash?: `0x${string}`;
    }, options?: ErrorOptions);
}
/**
 *  A contract rejected the call — the SDK decodes the revert against the
 *  protocol's custom-error ABIs so the failure reads as its Solidity name.
 *
 *  **Details**
 *
 *  `errorName` is the contract's own error (e.g. `"InsufficientBalance"`,
 *  `"MarketNotSettled"`, `"ExpiredOrderMustBeCancelled"`) and `args` its
 *  decoded parameters — that pair is what a caller branches on to decide
 *  whether to cancel-then-retry, top up collateral, or give up.
 *
 *  Thrown on every revert path: send-time rejection, pre-send simulation, a
 *  mined receipt with failed status, and `eth_call` reads.
 *
 *  **Gotchas**
 *
 *  `errorName` is not always populated. When the revert data doesn't match any
 *  known error (a bare `require` string, an unknown selector, or no data at all)
 *  it is `undefined` and `reason`/`data` carry whatever the node returned — so
 *  branch with a fallback arm rather than assuming a name. The error is still
 *  this class either way, so callers never face a raw viem error.
 *
 * **Example** (Handling a decoded revert)
 *
 *  ```ts
 *  import { ContractRevertError } from "@somnia-chain/markets-sdk";
 *
 *  try {
 *    await trader.placeOrder(params);
 *  } catch (e) {
 *    if (e instanceof ContractRevertError && e.errorName === "ExpiredOrderMustBeCancelled") {
 *      await trader.cancelExpiredOrders({ pool, orderIds: [orderId] });
 *    } else throw e;
 *  }
 *  ```
 *
 * @category errors
 */
export declare class ContractRevertError extends SomniaMarketsError {
    /** The decoded Solidity error name, or `undefined` when the revert didn't match a known error. */
    readonly errorName?: string;
    /** Decoded arguments of the custom error, positionally, when `errorName` is set. */
    readonly args?: readonly unknown[];
    /** A plain `require`/`revert` string reason, when the revert carried one instead of a custom error. */
    readonly reason?: string;
    /** Raw revert data as returned by the node, when present. */
    readonly data?: string;
    /** The contract that reverted, when known. */
    readonly address?: string;
    /** The function that was called, when known. */
    readonly functionName?: string;
    constructor(fields: {
        errorName?: string;
        args?: readonly unknown[];
        reason?: string;
        data?: string;
        address?: string;
        functionName?: string;
    }, options?: ErrorOptions);
}
/** Failures retained from collateral balance reads. @category errors */
export type CollateralReadError = NotConfiguredError | RpcError | ContractRevertError;
/**
 *  Which gate refused an indexer read, and so what the caller should do next.
 *  See {@link IndexerUnavailableError} for the per-reason table.
 *
 * @category errors
 */
export type IndexerRefusalReason = "breaker-open" | "breaker-trial" | "queue-full" | "live-reset";
/**
 *  The SDK stopped an indexer read locally.
 *
 *  **Details**
 *
 *  A `breaker-open`, `breaker-trial`, or `queue-full` refusal leaves no request
 *  on the wire and returns at once instead of after a 30 s timeout.
 *  A `live-reset` can stop a retry backoff after an earlier attempt was sent.
 *  The breaker opens after {@link IndexerLimits.breakerThreshold} consecutive
 *  endpoint failures (timeouts or HTTP 429/502/503/504) and stays open for
 *  {@link IndexerLimits.breakerCooldownMs}.
 *
 *  **When to use**
 *
 *  Catch it to show "the indexer is not answering" at once rather than spinning a
 *  skeleton. `retryAfterMs` says how much cooling period is left, so a poller can
 *  sleep exactly that long.
 *
 *  **Gotchas**
 *
 *  A subclass of {@link IndexerError}, so existing `instanceof IndexerError`
 *  handling is unaffected. A gate refusal (`breaker-open`, `breaker-trial`,
 *  `queue-full`) means nothing reached the network: if a gate refuses a retry
 *  after an earlier attempt was sent, the read fails with that attempt's
 *  {@link IndexerError} instead. `live-reset` can end a retry's backoff, so an
 *  earlier attempt may have been sent. Never retry it in a tight loop — that is the storm the
 *  breaker exists to stop.
 *
 *  Branch on `reason`; the four cases want different things, and only
 *  `breaker-open` carries a meaningful `retryAfterMs`:
 *
 *  | `reason` | Means | Your move |
 *  | --- | --- | --- |
 *  | `breaker-open` | Consecutive endpoint failures opened the breaker | Sleep `retryAfterMs`, then retry |
 *  | `breaker-trial` | The cooling period ended and another read is the trial | Retry shortly; the trial decides |
 *  | `queue-full` | This client already has `maxQueued` reads waiting for a slot | Back off on your own schedule ({@link nextBackoffDelayMs}) or send less |
 *  | `live-reset` | `stopLive()` reset the live-read lifecycle while this read queued or backed off | Retry on the SAME client; it stays usable |
 *
 * **Example** (Sleeping for exactly the cooling period)
 *
 *  ```ts
 *  import { IndexerUnavailableError } from "@somnia-chain/markets-sdk";
 *
 *  try {
 *    await exchange.client.listBinaryMarkets();
 *  } catch (e) {
 *    if (!(e instanceof IndexerUnavailableError)) throw e;
 *    // Only `breaker-open` carries a cooling period; the rest retry sooner.
 *    await new Promise((r) => setTimeout(r, e.retryAfterMs || 1_000));
 *  }
 *  ```
 *
 * @category errors
 */
export declare class IndexerUnavailableError extends IndexerError {
    readonly reason: IndexerRefusalReason;
    readonly retryAfterMs: number;
    readonly consecutiveFailures: number;
    /**
     * Creates a locally-refused indexer error.
     *
     * **Details**
     *
     * - `operation`: GraphQL operation name that was refused.
     * - `reason`: Which gate refused, and so what the caller should do next.
     * - `detail`: Why the SDK refused, in prose.
     * - `retryAfterMs`: Cooling period remaining. Meaningful only for
     *   `breaker-open`; `0` for every other reason, where the wait is the
     *   caller's own backoff rather than a period the SDK knows.
     * - `consecutiveFailures`: Endpoint failures in a row recorded so far: timeouts
     *   and overload responses (HTTP 429, 502, 503, 504).
     */
    constructor(operation: string, reason: IndexerRefusalReason, detail: string, retryAfterMs: number, consecutiveFailures: number);
}
/**
 *  The accounts indexer is there but will not answer right now — rate-limited,
 *  overloaded or unreachable — on a smart-account indexed read.
 *
 *  **Details**
 *
 *  Not a broken read: wait and ask again. `retryAfterMs` is how long the
 *  accounts indexer asked to wait, when it said; `undefined` when it did not.
 *  Distinct from {@link IndexerUnavailableError}, which is this SDK's own
 *  request governor refusing a markets-indexer read.
 *
 * @category errors
 */
export declare class AccountsIndexerUnavailableError extends IndexerError {
    readonly retryAfterMs: number | undefined;
    constructor(operation: string, detail: string, retryAfterMs: number | undefined, options?: ErrorOptions & {
        chainId?: number;
    });
}
/**
 *  A smart-account feed's cursor was issued against an accounts index that has
 *  since been rebuilt, so continuing from it would skip or repeat rows.
 *  Discard the pages read so far and start the read again without a cursor.
 *
 * @category errors
 */
export declare class AccountFeedRestartRequiredError extends SomniaMarketsError {
    readonly chainId: number;
    constructor(chainId: number, options?: ErrorOptions);
}
/**
 *  Why an account view failed with {@link AccountViewError}.
 *
 *  | `reason` | Means | Your move |
 *  | --- | --- | --- |
 *  | `invalidResponse` | The indexer answered with data that breaks the account-view contract | Retry later; if it persists, the indexer serves broken data |
 *  | `scopeMismatch` | The indexer answered with data for another account, chain or dataset | Retry later; if it persists, the indexer serves broken data |
 *  | `snapshotUnstable` | The account changed during every read attempt | Retry |
 *
 * @category errors
 */
export type AccountViewErrorReason = "invalidResponse" | "scopeMismatch" | "snapshotUnstable";
/**
 *  The indexer answered an account-view read, but the SDK could not accept the answer
 *  as one complete account.
 *
 *  **Details**
 *
 *  The account view checks every row and every version it reads. This error means a
 *  check failed, so the SDK shows nothing rather than a partial account. It is never
 *  an empty account. `reason` says which check failed; see
 *  {@link AccountViewErrorReason}.
 *
 *  **Gotchas**
 *
 *  A subclass of {@link IndexerError}, so existing `instanceof IndexerError`
 *  handling still catches it. A request that did not complete is a plain
 *  {@link IndexerError}, not this class.
 *
 * @category errors
 */
export declare class AccountViewError extends IndexerError {
    readonly reason: AccountViewErrorReason;
    /** The chain of the account view that failed. */
    readonly chainId: number;
    /**
     * Creates an account-view error.
     *
     * **Details**
     *
     * - `operation`: The SDK method that failed, for example `"accountOrders.getSnapshot"`.
     * - `reason`: Which check failed.
     * - `detail`: What the check found, in prose.
     * - `options`: The chain, and a standard `cause` passthrough.
     */
    constructor(operation: string, reason: AccountViewErrorReason, detail: string, options: ErrorOptions & {
        chainId: number;
    });
}
/**
 *  A write needs collateral on the market's chain, and the account does not
 *  hold enough of it THERE — though it may hold it on another chain the
 *  exchange spans.
 *
 *  **Details**
 *
 *  A market is unique to one chain and its collateral must sit on that chain.
 *  The exchange checks the escrow token's balance on the market's chain before
 *  encoding an order and throws this instead of letting the pool revert, so the
 *  caller learns WHERE the funds are and gets a ready bridge plan. Nothing was
 *  sent on any chain.
 *
 *  - `chainId`, `token`, `code`: the chain and the escrow token (address, and its currency code) the order needs.
 *  - `needed`, `held`, `shortfall`: raw token units on that chain.
 *  - `elsewhere`: the raw balance of the same bridge token on every other
 *    configured chain the bridge registry lists it on. The bridge token is
 *    found by the escrow token's address in the registry, not by `code`. A
 *    token the registry does not list has no route, so `elsewhere` is empty.
 *  - `unread`: chains whose balance could not be read, so their absence from
 *    `elsewhere` is not a zero balance. A chain listed here may hold the shortfall.
 *  - `readErrors`: the original typed errors, keyed by chain and retained in `cause`.
 *  - `plan`: a {@link BridgeTransfer} from the richest other chain covering the
 *    shortfall, when the token has a bridge route; absent when it does not.
 *
 *  On a spot order, `needed` is the pool's own requirement net of the account's
 *  pool vault balance (`getAutoPullRequirement(...).delta`), and `held` is the
 *  wallet balance. Under the pool's manual vault mode, `needed` is the full
 *  requirement, `held` is the vault balance, `elsewhere` is empty, and there is
 *  no `plan`: the pool does not pull from the wallet, so only a vault deposit
 *  funds the order.
 *
 *  **Gotchas**
 *
 *  Explicit by design: the exchange never bridges on its own. Execute `plan`
 *  through `exchange.bridge.transfer(...)`, or ask for it with
 *  `createOrder(…, { funding: "auto" })`, or pass `{ funding: "skip" }` to
 *  bypass the check on a hot path you fund yourself.
 *
 * @category errors
 */
export declare class CollateralOnWrongChainError extends SomniaMarketsError {
    /** Numeric chain id the market — and so the collateral — lives on. */
    readonly chainId: number;
    /** The escrow token's address on that chain, lowercased (the zero address for the native coin). */
    readonly token: string;
    /** The escrow token's currency code, the key {@link UnifiedBalances} uses. */
    readonly code: string;
    /**
     *  Raw units the order needs on `chainId`. On a spot order this is the pool's
     *  requirement net of the pool vault balance, or the full requirement under
     *  manual vault mode.
     */
    readonly needed: bigint;
    /**
     *  Raw units the account holds on `chainId` toward `needed`: the wallet
     *  balance, or the pool vault balance under manual vault mode.
     */
    readonly held: bigint;
    /** `needed − held`, raw units. */
    readonly shortfall: bigint;
    /** The same bridge token's raw balance on every OTHER configured chain the bridge registry lists it on, keyed by chain id. */
    readonly elsewhere: Record<number, bigint>;
    /**
     *  Chains whose balance read failed. Empty when all reads succeed.
     *  Retry these chains before concluding that no bridge route covers the shortfall.
     */
    readonly unread: readonly number[];
    /** Failed balance reads by chain. The same errors are retained in the aggregate cause. */
    readonly readErrors: Readonly<Record<number, CollateralReadError>>;
    /** A bridge plan covering the shortfall from the richest other chain, when a route exists. */
    readonly plan?: BridgeTransfer;
    constructor(fields: {
        chainId: number;
        token: string;
        code: string;
        needed: bigint;
        held: bigint;
        elsewhere: Record<number, bigint>;
        unread?: readonly number[];
        readErrors?: Readonly<Record<number, CollateralReadError>>;
        plan?: BridgeTransfer;
        symbol: string;
    });
}
/**
 *  A native bridge route cannot deliver: the destination router holds less
 *  than the transfer amount. The SDK refused the transfer, and nothing was sent.
 *
 *  **Details**
 *
 *  A `native` route (STT) pays out of the destination router's own balance
 *  instead of minting. When that balance is below the amount, the relayer's
 *  delivery reverts, and the funds stay in escrow on the origin until someone
 *  seeds the router. `exchange.bridge.transfer`, `exchange.ensureFunds` and
 *  `createOrder(…, { funding: "auto" })` read the router balance first and
 *  throw this error instead of sending.
 *
 *  - `token`, `from`, `to`: the route.
 *  - `router`: the destination router whose balance was read.
 *  - `amount`: raw units the transfer would deliver.
 *  - `available`: raw units the router held when the SDK read it.
 *
 *  **Gotchas**
 *
 *  Retry after the router is seeded, bridge at most `available`, or fund the
 *  destination another way. The check is a read, not a reservation: another
 *  transfer can still drain the router after the check passes.
 *
 * @category errors
 */
export declare class BridgeLiquidityError extends SomniaMarketsError {
    /** The bridged token. */
    readonly token: BridgeToken;
    /** Origin chain id. */
    readonly from: number;
    /** Destination chain id. */
    readonly to: number;
    /** The destination router that pays out the delivery. */
    readonly router: Address;
    /** Raw units the transfer would deliver, in the origin side's decimals (equal to the destination's on every native route). */
    readonly amount: bigint;
    /** Raw units the destination router held. */
    readonly available: bigint;
    constructor(fields: {
        token: BridgeToken;
        from: number;
        to: number;
        router: Address;
        amount: bigint;
        available: bigint;
    });
}
/**
 *  A bridge transfer was sent, but its message was not delivered on the
 *  destination within the delivery timeout. The funds are in flight, not lost.
 *
 *  **Details**
 *
 *  `exchange.ensureFunds` and `createOrder(…, { funding: "auto" })` throw this
 *  error. `exchange.bridge.transfer` does not throw it: it resolves with
 *  `delivered: false` and the same `messageId`.
 *
 *  - `messageId`: the Hyperlane message id, decoded from the origin receipt.
 *  - `bridgeHash`: the origin transaction that dispatched the message.
 *  - `token`, `from`, `to`: the route.
 *  - `amount`: raw units sent, in the origin side's decimals.
 *
 *  **Gotchas**
 *
 *  Do not send the transfer again before you check the message. Call
 *  `delivered(messageId)` on the destination chain's Mailbox (the `mailbox` of
 *  `getBridgeNetwork(to)`). When it returns `false`, the message can still
 *  land. A second transfer moves the funds twice. A later `ensureFunds` or
 *  auto-funded order on the same exchange does this for you: it waits for the
 *  pending message and sends no new leg for it.
 *
 * @category errors
 */
export declare class BridgeDeliveryTimeoutError extends SomniaMarketsError {
    /** The Hyperlane message id of the transfer. */
    readonly messageId: Hex;
    /** Hash of the origin transaction that dispatched the message. */
    readonly bridgeHash: Hash;
    /** Origin chain id. */
    readonly from: number;
    /** Destination chain id. */
    readonly to: number;
    /** The bridged token. */
    readonly token: BridgeToken;
    /** Raw units sent, in the origin side's decimals. */
    readonly amount: bigint;
    constructor(fields: {
        messageId: Hex;
        bridgeHash: Hash;
        from: number;
        to: number;
        token: BridgeToken;
        amount: bigint;
    });
}
