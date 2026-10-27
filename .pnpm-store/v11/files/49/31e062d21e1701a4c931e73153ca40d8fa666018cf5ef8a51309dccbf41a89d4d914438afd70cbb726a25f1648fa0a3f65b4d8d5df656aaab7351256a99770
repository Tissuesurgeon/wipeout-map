// The SDK's error vocabulary — every failure the SDK raises is one of these
// classes, so callers branch with `instanceof` instead of matching message
// strings. One class per distinct thing a caller would DO about it, not one per
// throw site:
//
//   InvalidInputError    → fix the call (bad amount, unknown symbol, wrong market kind)
//   NotConfiguredError   → fix the client config (an address/URL the feature needs)
//   SignerRequiredError  → supply a signer (the method writes)
//   IndexerError         → the indexer request didn't complete (retry / degrade)
//   AccountViewError     → the indexer answered, but not with one complete account (retry later)
//   IncompleteHistoryError → requested analytics could not cover every indexed fill
//   RpcError             → the node request didn't complete (a read: retry / switch RPC)
//   TransactionOutcomeUnknownError → a signed write may have landed (look up `hash` before re-sending)
//   ContractRevertError  → the chain rejected the call (read `errorName` to decide)
//
// Every class sets `name` (logs and `err.name` checks depend on it) and carries
// the underlying failure in `cause` when it wraps one. The messages keep the
// existing "@somnia-chain/markets-sdk: …" prefix so logs stay greppable.
//
// IMPORTANT — typing errors did NOT move the absence-vs-failure boundary (see
// CONVENTIONS.md "Return + error contract"): an indexer point read still
// resolves to `null` for a row that isn't there and THROWS (IndexerError) when
// the request fails; `list*` still returns `[]` only for "no rows"; chain reads
// still throw rather than ever handing back `null`.

import type { Address, Hash, Hex } from "viem";
import type { BridgeToken, BridgeTransfer } from "./chains/bridge/types.js";

/** The `@somnia-chain/markets-sdk: ` prefix every SDK error message carries. */
const PREFIX = "@somnia-chain/markets-sdk: ";

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
export class SomniaMarketsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message.startsWith(PREFIX) ? message : PREFIX + message, options);
    this.name = "SomniaMarketsError";
  }
}

/**
 * @internal Classify the finite SDK vocabulary without inspecting arbitrary values.
 * Invariant's genuine class is supplied privately to avoid an errors/raise runtime cycle.
 */
export function sdkFailure(
  caught: unknown,
  Invariant: typeof import("./raise.js").InvariantError,
): import("./config.js").SomniaMarketsSocketFailure | undefined {
  try {
    if (
      caught instanceof InvalidInputError ||
      caught instanceof NotConfiguredError ||
      caught instanceof NotSupportedError ||
      caught instanceof SignerRequiredError ||
      caught instanceof IndexerError ||
      caught instanceof IndexerUnavailableError ||
      caught instanceof IndexerWaitTimeoutError ||
      caught instanceof RpcError ||
      caught instanceof ContractRevertError ||
      caught instanceof TransactionOutcomeUnknownError ||
      caught instanceof FillHistoryRestartRequiredError ||
      caught instanceof FillHistoryUnavailableError ||
      caught instanceof IncompleteHistoryError ||
      caught instanceof CollateralOnWrongChainError ||
      caught instanceof BridgeLiquidityError ||
      caught instanceof BridgeDeliveryTimeoutError ||
      caught instanceof Invariant
    )
      return caught;
  } catch {
    // A hostile Proxy prototype trap is not class evidence. The owning boundary
    // retains the exact original value as the semantic failure's cause.
  }
  return undefined;
}

/**
 * Internal error discrimination for owned mapping seams. A thrown value can be
 * a Proxy whose prototype lookup fails; that failure must not replace the value
 * being normalized or prevent rejection-time provenance from being recorded.
 */
export function isErrorInstance<T extends SomniaMarketsError>(
  value: unknown,
  errorClass: abstract new (...args: never[]) => T,
): value is T {
  try {
    return value instanceof errorClass;
  } catch {
    return false;
  }
}

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
export class InvalidInputError extends SomniaMarketsError {
  /**
   *  The chain ids of a call that named no chain, or named two chains that do
   *  not agree. Set by `exchange.client` and `exchange.trader` on a multi-chain
   *  exchange (the chains it spans) and by `createReactivity` (the engine's
   *  chain, then the wallet's). Absent on every other input error.
   */
  declare readonly chainIds?: readonly number[];

  /**
   * Creates an invalid-input error with an optional underlying cause.
   *
   * **Details**
   *
   * - `message`: What was wrong with the input.
   * - `options`: Standard `cause` passthrough, plus `chainIds` when the fault is a chain choice.
   */
  constructor(message: string, options?: ErrorOptions & { chainIds?: readonly number[] }) {
    super(message, options);
    this.name = "InvalidInputError";
    // Set only when given, so other input errors keep their current shape.
    if (options?.chainIds) this.chainIds = [...options.chainIds];
  }
}

/**
 * A fill continuation belongs to a different serving dataset. Discard all
 * accumulated pages and call `getUserFillsPage` again without a cursor.
 *
 * @category errors
 */
export class FillHistoryRestartRequiredError extends SomniaMarketsError {
  constructor(
    readonly cursorGeneration: string,
    readonly servingGeneration: string,
  ) {
    super(
      `Fill history dataset changed from ${JSON.stringify(cursorGeneration)} to ${JSON.stringify(servingGeneration)}; discard prior pages and restart from page one`,
    );
    this.name = "FillHistoryRestartRequiredError";
  }
}

/**
 * The serving indexer has not initialized its fill-history dataset contract.
 * Deploy and reindex a compatible producer before reading historical pages.
 *
 * @category errors
 */
export class FillHistoryUnavailableError extends SomniaMarketsError {
  constructor(
    readonly operation: string,
    options?: ErrorOptions,
  ) {
    super(`${operation} requires an indexer with an initialized FillDataset generation`, options);
    this.name = "FillHistoryUnavailableError";
  }
}

/**
 * The serving indexer does not serve perp position changes: it predates the
 * `PerpPositionChange` table. Reindex it with a compatible producer before
 * pairing fills with their position updates. Until then, show a fill's own side.
 *
 * @category errors
 */
export class PerpPositionChangesUnavailableError extends SomniaMarketsError {
  constructor(
    readonly operation: string,
    options?: ErrorOptions,
  ) {
    super(`${operation} requires an indexer that serves perp position changes`, options);
    this.name = "PerpPositionChangesUnavailableError";
  }
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
export class NotConfiguredError extends SomniaMarketsError {
  /**
   * Creates a missing-configuration error for one operation.
   *
   * **Details**
   *
   * - `what`: The config key or contract the operation needs (e.g. `"addresses.oracleHub"`).
   * - `detail`: What was being attempted, and how to supply it.
   */
  constructor(
    readonly what: string,
    detail: string,
  ) {
    super(`${detail} — needs ${what}`);
    this.name = "NotConfiguredError";
  }
}

/**
 *  The call is valid, but this SDK version does not support it yet. Thrown
 *  before any network round-trip. Do not retry: use a supported option, or
 *  upgrade the SDK.
 *
 * @category errors
 */
export class NotSupportedError extends SomniaMarketsError {
  /**
   * Creates a not-supported error for one feature.
   *
   * **Details**
   *
   * - `feature`: The unsupported feature (e.g. `'getAccountEquity scope "spot"'`).
   */
  constructor(readonly feature: string) {
    super(`${feature} is not supported yet`);
    this.name = "NotSupportedError";
  }
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
export class SignerRequiredError extends SomniaMarketsError {
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
  constructor(
    readonly operation: string,
    readonly guidance = "construct SomniaMarkets with a privateKey / account / walletClient",
  ) {
    super(`${operation} is authenticated — ${guidance}`);
    this.name = "SignerRequiredError";
  }
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
export class IndexerError extends SomniaMarketsError {
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
  declare readonly chainId?: number;

  /**
   * Creates an indexer error with operation context and an optional cause.
   *
   * **Details**
   *
   * - `operation`: GraphQL operation name that failed (e.g. `"listBinaryMarkets"`).
   * - `detail`: Why it failed (HTTP status, GraphQL error message, "empty response").
   * - `options`: Standard `cause` passthrough — the underlying fetch/GraphQL failure — plus `chainId` when the failing chain is known.
   */
  constructor(
    readonly operation: string,
    detail: string,
    options?: ErrorOptions & { chainId?: number },
  ) {
    super(`indexer ${operation} failed: ${detail}`, options);
    this.name = "IndexerError";
    // Set only when given, so other indexer errors keep their current shape.
    if (options?.chainId !== undefined) this.chainId = options.chainId;
  }
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
export class IncompleteHistoryError extends SomniaMarketsError {
  /** The owner method that requires complete indexed history. */
  readonly operation: string;
  /** The action a caller must take before analytics can be trusted. */
  readonly reason: "pageBudgetExceeded" | "cursorCycle";
  /** Successful fill pages read before rejecting the incomplete result. */
  readonly pagesRead: number;
  /** Configured page budget, when the caller supplied one. */
  readonly maxFillPages?: number;

  constructor(
    operation: string,
    reason: "pageBudgetExceeded" | "cursorCycle",
    pagesRead: number,
    maxFillPages?: number,
  ) {
    super(`${operation} cannot compute analytics from incomplete indexed history: ${reason} after ${pagesRead} pages`);
    this.name = "IncompleteHistoryError";
    this.operation = operation;
    this.reason = reason;
    this.pagesRead = pagesRead;
    this.maxFillPages = maxFillPages;
  }
}

/**
 * A complete claimable read exceeded its bounded position page. Use
 * `client.getClaimablePage` and follow its raw-position `nextOffset` instead.
 * The indexer answered successfully; retrying the same unqualified read cannot
 * recover the omitted rows.
 *
 * @category errors
 */
export class IncompletePortfolioError extends SomniaMarketsError {
  /** Creates a refusal carrying the account and bounded page that was inspected. */
  constructor(
    readonly account: string,
    readonly limit: number,
    readonly nextOffset: number,
  ) {
    super(
      `getClaimable cannot return a complete portfolio for ${account} within ${limit} positions; use getClaimablePage`,
    );
    this.name = "IncompletePortfolioError";
  }
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
export class IndexerWaitTimeoutError extends SomniaMarketsError {
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
  constructor(
    readonly targetBlock: number,
    readonly latestProcessedBlock: number | null,
    readonly timeoutMs: number,
    readonly waitedMs: number,
    readonly polls: number,
  ) {
    super(
      `indexer did not reach block ${targetBlock} within ${timeoutMs}ms ` +
        `(waited ${waitedMs}ms; processed ${latestProcessedBlock ?? "nothing"} after ${polls} polls)`,
    );
    this.name = "IndexerWaitTimeoutError";
  }
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
export class RpcError extends SomniaMarketsError {
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
  declare readonly chainId?: number;

  /**
   * Creates an RPC error with operation context and an optional cause.
   *
   * **Details**
   *
   * - `operation`: What was attempted (e.g. `"eth_sendRawTransaction"`, `"watchBook"`).
   * - `detail`: Why it failed.
   * - `options`: Standard `cause` passthrough — the underlying viem/transport error — plus `chainId` when the failing chain is known.
   */
  constructor(
    readonly operation: string,
    detail: string,
    options?: ErrorOptions & { chainId?: number },
  ) {
    super(`rpc ${operation} failed: ${detail}`, options);
    this.name = "RpcError";
    // Set only when given, so other RPC errors keep their current shape.
    if (options?.chainId !== undefined) this.chainId = options.chainId;
  }
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
export class TransactionOutcomeUnknownError extends RpcError {
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
  constructor(fields: { chainId: number; operation: string; hash?: `0x${string}` }, options?: ErrorOptions) {
    super(
      fields.operation,
      `transaction ${fields.hash ?? "(no hash)"} on chain ${fields.chainId} may have been sent; its receipt was not observed`,
      options,
    );
    this.name = "TransactionOutcomeUnknownError";
    this.chainId = fields.chainId;
    this.hash = fields.hash;
  }
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
export class ContractRevertError extends SomniaMarketsError {
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

  constructor(
    fields: {
      errorName?: string;
      args?: readonly unknown[];
      reason?: string;
      data?: string;
      address?: string;
      functionName?: string;
    },
    options?: ErrorOptions,
  ) {
    super(revertMessage(fields), options);
    this.name = "ContractRevertError";
    this.errorName = fields.errorName;
    this.args = fields.args;
    this.reason = fields.reason;
    this.data = fields.data;
    this.address = fields.address;
    this.functionName = fields.functionName;
  }
}

/** Builds the human half of a {@link ContractRevertError} message from whatever the revert yielded. */
function revertMessage(fields: {
  errorName?: string;
  args?: readonly unknown[];
  reason?: string;
  data?: string;
  functionName?: string;
}): string {
  const where = fields.functionName ? `${fields.functionName} reverted` : "call reverted";
  if (fields.errorName !== undefined) {
    const args = fields.args?.length ? `(${fields.args.map(formatArg).join(", ")})` : "()";
    return `${where}: ${fields.errorName}${args}`;
  }
  if (fields.reason !== undefined) return `${where}: ${fields.reason}`;
  if (fields.data !== undefined && fields.data !== "0x") {
    return `${where} with unrecognized error data ${fields.data}`;
  }
  return `${where} without error data`;
}

/** Renders one decoded revert argument for a message — bigints get no `n` suffix, addresses stay hex. */
function formatArg(arg: unknown): string {
  if (typeof arg === "bigint") return arg.toString();
  if (typeof arg === "string") return arg;
  return JSON.stringify(arg) ?? String(arg);
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
export class IndexerUnavailableError extends IndexerError {
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
  constructor(
    operation: string,
    readonly reason: IndexerRefusalReason,
    detail: string,
    readonly retryAfterMs: number,
    readonly consecutiveFailures: number,
  ) {
    // The message carries the fields a caller branches on, so a log line alone
    // says which gate refused and how long the cooling period has left
    // (SDK-ERR-004).
    super(
      operation,
      `${detail} [${reason}] (retry after ${retryAfterMs}ms, ${consecutiveFailures} consecutive endpoint failures)`,
    );
    this.name = "IndexerUnavailableError";
  }
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
export class AccountsIndexerUnavailableError extends IndexerError {
  constructor(
    operation: string,
    detail: string,
    readonly retryAfterMs: number | undefined,
    options?: ErrorOptions & { chainId?: number },
  ) {
    super(operation, `${detail}${retryAfterMs === undefined ? "" : ` (retry after ${retryAfterMs}ms)`}`, options);
    this.name = "AccountsIndexerUnavailableError";
  }
}

/**
 *  A smart-account feed's cursor was issued against an accounts index that has
 *  since been rebuilt, so continuing from it would skip or repeat rows.
 *  Discard the pages read so far and start the read again without a cursor.
 *
 * @category errors
 */
export class AccountFeedRestartRequiredError extends SomniaMarketsError {
  constructor(
    readonly chainId: number,
    options?: ErrorOptions,
  ) {
    super(`the accounts index for chain ${chainId} was rebuilt; restart the feed from its first page`, options);
    this.name = "AccountFeedRestartRequiredError";
  }
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
export class AccountViewError extends IndexerError {
  /** The chain of the account view that failed. */
  declare readonly chainId: number;

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
  constructor(
    operation: string,
    readonly reason: AccountViewErrorReason,
    detail: string,
    options: ErrorOptions & { chainId: number },
  ) {
    super(operation, `${detail} [${reason}]`, options);
    this.name = "AccountViewError";
  }
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
export class CollateralOnWrongChainError extends SomniaMarketsError {
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
  }) {
    const shortfall = fields.needed - fields.held;
    const where = Object.entries(fields.elsewhere)
      .filter(([, v]) => v > 0n)
      .map(([c, v]) => `${v} on chain ${c}`)
      .join(", ");
    const readErrors = Object.freeze({ ...fields.readErrors });
    const unread = [...new Set([...(fields.unread ?? []), ...Object.keys(readErrors).map(Number)])].sort(
      (a, b) => a - b,
    );
    const failures = Object.values(readErrors);
    super(
      `${fields.symbol} needs ${fields.needed} ${fields.code} on chain ${fields.chainId} but the account holds ${fields.held} there` +
        (where ? ` (held: ${where})` : "") +
        (fields.plan
          ? ` — a bridge plan from chain ${fields.plan.origin.chainId} is attached`
          : " — no bridge plan is attached") +
        // Unread chains may still hold funds for a bridge.
        (unread.length > 0
          ? ` (${unread.length === 1 ? "chain" : "chains"} ${unread.join(", ")} could not be read)`
          : ""),
      failures.length > 0 ? { cause: new AggregateError(failures, "Collateral balance reads failed") } : undefined,
    );
    this.name = "CollateralOnWrongChainError";
    this.chainId = fields.chainId;
    this.token = fields.token;
    this.code = fields.code;
    this.needed = fields.needed;
    this.held = fields.held;
    this.shortfall = shortfall;
    this.elsewhere = fields.elsewhere;
    // Preserve the result if the caller later changes its array.
    this.unread = unread;
    this.readErrors = readErrors;
    this.plan = fields.plan;
  }
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
export class BridgeLiquidityError extends SomniaMarketsError {
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
  }) {
    super(
      `${fields.token} bridge from chain ${fields.from} to chain ${fields.to} refused: the destination router ` +
        `${fields.router} holds ${fields.available}, below the ${fields.amount} to deliver. Nothing was sent`,
    );
    this.name = "BridgeLiquidityError";
    this.token = fields.token;
    this.from = fields.from;
    this.to = fields.to;
    this.router = fields.router;
    this.amount = fields.amount;
    this.available = fields.available;
  }
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
export class BridgeDeliveryTimeoutError extends SomniaMarketsError {
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
  }) {
    super(
      `${fields.token} bridge ${fields.bridgeHash} from chain ${fields.from} to chain ${fields.to} was sent, but ` +
        `message ${fields.messageId} was not delivered in time. Check delivered(messageId) on the destination ` +
        `Mailbox before you send again`,
    );
    this.name = "BridgeDeliveryTimeoutError";
    this.messageId = fields.messageId;
    this.bridgeHash = fields.bridgeHash;
    this.from = fields.from;
    this.to = fields.to;
    this.token = fields.token;
    this.amount = fields.amount;
  }
}
