# How to handle errors and reverts

This guide shows you how to branch on the errors the SDK throws so a bot or a UI reacts correctly to a bad input, an outage, and a rejected transaction. It assumes you write `try`/`catch` in TypeScript. The complete list of classes and contract error names is in [Errors](../reference/errors.md).

## Branch on the class, not the message

Every SDK error has a concrete class. Test with `instanceof`, most specific first, and keep a final `throw` for errors the SDK does not own. `InvariantError` is the class for an SDK defect; report it and rethrow it instead of using it for control flow.

```ts
import {
  ContractRevertError,
  FillHistoryRestartRequiredError,
  FillHistoryUnavailableError,
  IndexerError,
  IndexerWaitTimeoutError,
  InvariantError,
  InvalidInputError,
  PerpPositionChangesUnavailableError,
  RpcError,
  SignerRequiredError,
  SomniaMarketsError,
  TransactionOutcomeUnknownError,
} from "@somnia-chain/markets-sdk";

try {
  await exchange.createOrder("SOMI/USDso", "limit", "buy", 10, 0.11);
} catch (e) {
  if (e instanceof TransactionOutcomeUnknownError) {
    // the order may be on chain: look up e.hash before placing it again
  } else if (e instanceof ContractRevertError) {
    // the chain rejected it: read e.errorName
  } else if (e instanceof InvalidInputError) {
    // the call is wrong: fix the arguments, do not retry
  } else if (e instanceof SignerRequiredError) {
    // configure a privateKey, account, or walletClient
  } else if (e instanceof FillHistoryRestartRequiredError) {
    // getUserFillsPage: discard accumulated pages and request page one without a cursor
  } else if (e instanceof FillHistoryUnavailableError) {
    // deploy and reindex a producer that initializes the fill dataset generation
  } else if (e instanceof PerpPositionChangesUnavailableError) {
    // listPerpPositionChangesForFills: show each fill's own side until the indexer is reindexed
  } else if (e instanceof RpcError || e instanceof IndexerError) {
    // the request did not complete: retry with backoff, or degrade
  } else if (e instanceof InvariantError) {
    console.error(e); // report the SDK defect
    throw e;
  } else if (e instanceof SomniaMarketsError) {
    // NotConfiguredError and anything else the SDK raised
  } else {
    throw e; // not ours: a wallet or an application bug
  }
}
```

`IndexerWaitTimeoutError` comes from the indexer wait, not from the write. Wrap
`waitForIndexedBlock` when you need to branch on that deadline:

```ts
const targetBlock = 1_234_567n; // the confirmed transaction's block
try {
  await exchange.client.waitForIndexedBlock(exchange.client.config.chain.id, targetBlock);
} catch (e) {
  if (e instanceof IndexerWaitTimeoutError) {
    // the indexer answered but is still behind e.targetBlock
  } else if (e instanceof IndexerError) {
    // the metadata read did not complete: retry with backoff, or degrade
  } else {
    throw e;
  }
}
```

Message text is not stable. `errorName`, `operation`, `what`, `cursorGeneration`, and `servingGeneration` are.

## Decide from a revert

`ContractRevertError.errorName` is the contract's own error name when the revert data matched a known error. Branch on it with a fallback arm; `errorName` is `undefined` for a bare `require` string or unknown data.

```ts
import { ContractRevertError } from "@somnia-chain/markets-sdk";

try {
  await exchange.trader.placeOrder(params);
} catch (e) {
  if (!(e instanceof ContractRevertError)) throw e;
  switch (e.errorName) {
    case "ExpiredOrderMustBeCancelled": {
      // An expired maker sits in the way. Sweep the expired orders, then retry.
      const expired = await exchange.client.listSweepableOrders({ pool: params.pool });
      await exchange.trader.cancelExpiredOrders({ pool: params.pool, orderIds: expired.map((o) => o.orderId) });
      break;
    }
    case "InsufficientBalance":
    case "ERC20InsufficientBalance":
      // top up, then retry
      break;
    case "PostOnlyWouldCross":
      // re-quote one tick away
      break;
    case undefined:
      console.error("unrecognised revert", e.reason ?? e.data);
      break;
    default:
      throw e;
  }
}
```

`e.args` holds the decoded arguments in order. `IncorrectSender(sender, expected)`, for example, is what a cancel of an already-cancelled order returns; `expected` is the zero address because the order no longer exists.

## Retry only what can succeed

Retry a read that throws `RpcError` or `IndexerError` with backoff; the request never reached a conclusion. A write is different; see the next section. An `IndexerUnavailableError` is the SDK refusing locally. `breaker-open`, `breaker-trial`, and `queue-full` mean nothing was sent. `live-reset` can stop a retry backoff after an earlier attempt was sent. Branch on `reason` rather than waiting a fixed period, because `retryAfterMs` is meaningful only for `breaker-open`. Sleep `retryAfterMs` for `breaker-open`; retry shortly for `breaker-trial`, where a trial read is already deciding; back off on your own schedule for `queue-full`, since this client is saturated and retrying at once is just re-shed; and retry `live-reset` on the same client, which `stopLive()` leaves usable. Retrying sooner than the reason allows is what turns a slow indexer into an outage. An `IndexerWaitTimeoutError` means the indexer answered but did not reach `targetBlock` before the deadline: wait longer, or read the required state from chain. An `AccountViewError` means the indexer answered an account-view read, but not with one complete account. It never means an empty account. Retry `snapshotUnstable`: the account kept changing while it was read. Retry `invalidResponse` and `scopeMismatch` later; when they persist, the indexer serves broken data. An `IncompleteHistoryError` means portfolio analytics stopped before reading every indexed fill: raise or omit `maxFillPages` when `reason` is `pageBudgetExceeded`, and investigate the indexer when it is `cursorCycle`; it never means an empty portfolio. A `FillHistoryUnavailableError` means the producer has not initialized its fill-dataset generation: deploy and reindex a compatible producer before trying again. A `PerpPositionChangesUnavailableError` means the indexer predates perp position changes: show each fill's own side, and pair the fills again once the indexer is reindexed; retrying the same indexer fails the same way. A `FillHistoryRestartRequiredError` means a fill-page cursor belongs to a replaced serving dataset: discard the pages already read and restart from page one; retrying with the same cursor fails again. On the smart-account indexed reads, an `AccountsIndexerUnavailableError` means the accounts indexer is rate-limited or overloaded: wait `retryAfterMs` when it is set, otherwise back off, and retry. An `AccountFeedRestartRequiredError` means that chain's accounts index was rebuilt since the cursor was issued: discard the pages and read again without a cursor. Retry a `ContractRevertError` only after the state that caused it changes; the same call reverts the same way. Never retry `InvalidInputError`, `NotConfiguredError`, `NotSupportedError`, or `SignerRequiredError`; fix the code or the configuration. A `CollateralOnWrongChainError` means the collateral is on another configured chain: bridge the shortfall — the error carries a plan when a route exists — and retry once it lands. A `BridgeLiquidityError` means a native bridge route's destination router holds less than the amount, so the SDK sent nothing: retry after the router is seeded, bridge at most `available` with `exchange.bridge.transfer`, or fund the destination another way. A `BridgeDeliveryTimeoutError` means the bridge leg was sent, but its message was not delivered within the timeout. Do not bridge again at once, or the funds move twice. Call `delivered(messageId)` on the destination Mailbox. When it returns `false`, wait longer: the message can still land. Two bridge `RpcError` operations also come after the origin leg was sent: `bridge message id` and `watch bridge delivery`. The funds may be in flight, so look up the origin transaction before you retry.

For a binary wallet, `IncompletePortfolioError` means `getClaimable` observed
more than 200 nonzero positions. The read returns no incomplete claim array.
Use `getClaimablePage` and follow `nextOffset`, including when a page has no
claims. Retrying the same unqualified call cannot recover omitted positions.

## Retry a write only after you know its outcome

A write can fail after its signed transaction reached the node. The SDK then throws `TransactionOutcomeUnknownError`, a subclass of `RpcError`. The transaction can still mine, so sending the write again can place the order twice. Test for this class before `RpcError`.

The error carries `chainId`, `operation` and `hash`. Look up `hash` before you send again:

1. Read the receipt for `hash`. If it exists, the transaction mined. Do not send it again. Its `status` tells you whether the write succeeded (`"success"`) or reverted (`"reverted"`).
2. If there is no receipt, or no `hash` (a session send gives none), read the state the write changes. For an order, read your open orders at chain head with `exchange.client.getOwnOpenOrdersOnchain(pool, owner)`; see [Detect when an order fills](./detect-fills.md).
3. Send again only when that state shows the write did not happen.

```ts
import { TransactionOutcomeUnknownError } from "@somnia-chain/markets-sdk";

try {
  await exchange.trader.placeOrder(params);
} catch (e) {
  if (!(e instanceof TransactionOutcomeUnknownError)) throw e;
  const viem = exchange.client.getViemClient();
  const receipt = e.hash ? await viem.getTransactionReceipt({ hash: e.hash }).catch(() => null) : null;
  if (receipt === null) {
    // Unknown still: read your open orders at chain head before placing again.
  }
}
```

From the local-signer and session-key executors, a plain `RpcError` from a write means the node refused the transaction or nothing was sent. Fix the cause (for example a stale nonce or an unfunded account), then send again. Other writes do not guarantee this. A wallet client can fail after it broadcast, and admin, lend and bridge writes do not make the distinction yet. After one of those throws `RpcError`, check the chain before you send again.

## Degrade an indexer read

An indexer failure is never "no rows". Catch `IndexerError` deliberately when a page should render with stale or empty data rather than fail.

```ts
import { IndexerError } from "@somnia-chain/markets-sdk";

const trades = await exchange
  .fetchTrades("SOMI/USDso", undefined, 50)
  .catch((e) => (e instanceof IndexerError ? [] : Promise.reject(e)));
```

Do not apply the same pattern to a chain read: a chain read throws only on real failure, and an empty fallback would hide it.

## Tell cancellation apart from failure

When you pass `signal` in the configuration and abort it, in-flight indexer reads re-throw your abort reason, not an `IndexerError`. Check `e.name === "AbortError"` before the SDK classes.

## Decode a revert you sent yourself

If you build a transaction with the exported ABIs and send it through your own client, `decodeRevert(caught)` turns the failure into a `ContractRevertError` with the same `errorName` decoding. It always returns an error and never throws. Call it only on failures you know are reverts; a transport error passed to it comes back without `errorName`.

```ts
import { decodeRevert } from "@somnia-chain/markets-sdk";

try {
  await wallet.writeContract(request);
} catch (caught) {
  const revert = decodeRevert(caught);
  console.error(revert.errorName ?? revert.reason);
}
```

## See the failure in context

Pass a `debug` sink to see which span failed and with what arguments. See [Debug what the SDK is doing](./debug-the-sdk.md).
