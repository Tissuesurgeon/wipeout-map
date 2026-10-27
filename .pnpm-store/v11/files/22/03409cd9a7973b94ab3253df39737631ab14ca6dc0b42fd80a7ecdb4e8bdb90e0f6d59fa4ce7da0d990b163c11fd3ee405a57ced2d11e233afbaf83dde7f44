import { IndexerError, IndexerWaitTimeoutError, InvalidInputError, NotConfiguredError, RpcError, SomniaMarketsError, } from "./errors.js";
// Indexer sync status — how far behind head the indexer is.
//
// The one read whose answer is about the DATA SOURCE rather than the protocol: a
// UI uses it to decide whether an indexer-backed number is trustworthy right now,
// or whether to prefer a chain read. Kept separate from the concepts it qualifies
// precisely because it belongs to none of them.
import * as IndexerRead from "./indexerRead.js";
import * as GraphqlBoundary from "./graphqlBoundary.js";
import { graphql } from "./gql/gql.js";
/**
 *  First operation on the typed path (see {@link gqlRequest}): result and
 *  variables are DERIVED from the committed schema snapshot, so selecting a field
 *  `chain_metadata` does not have — or assuming the wrong nullability — fails
 *  `pnpm codegen` / `pnpm typecheck` rather than at runtime on every call.
 */
// prettier-ignore
const SyncStatusQuery = graphql(`
  query SyncStatus($chainId: Int!) {
    chain_metadata(where: { chain_id: { _eq: $chainId } }) {
      chain_id
      latest_processed_block
      block_height
      num_events_processed
    }
  }
`);
/** Every chain the endpoint indexes. Unfiltered on purpose: the answer names what it serves. */
// prettier-ignore
const IndexedChainsQuery = graphql(`
  query IndexedChains {
    chain_metadata {
      chain_id
    }
  }
`);
/**
 *  Build an owner's one-time check that its indexer serves its chain.
 *
 *  Rows carry no chain of their own: the owner stamps its configured chain id
 *  on every market row. So an indexer that serves another chain would list
 *  that chain's markets as this chain's, and the pools behind them can hold
 *  different contracts here. The check reads the unfiltered `chain_metadata`
 *  once and fails with {@link NotConfiguredError} when the owner's chain has no
 *  row. It costs one request per owner. Reads send their own request alongside
 *  it and hold their rows until it passes (`IndexerRead.afterBinding`). Success
 *  is kept, and the check then returns `undefined`; a failure is not kept, so the
 *  next read checks again. The complete binding selection is admitted before
 *  success is cached. Nullable signed GraphQL Int chain ids keep their schema
 *  meaning; null ids do not identify a chain. Malformed collections, rows or
 *  scalars reject with IndexerError(IndexedChains), retaining the invalid wire
 *  value and its path in the TypeError cause.
 *
 *  `context` must not carry a `verifyBinding` of its own, or the check would
 *  wait on itself.
 */
export function makeBindingCheck(context) {
    let verified = false;
    let pending;
    // `undefined` once verified, so a read after the first one does not wait a tick.
    return () => {
        if (verified)
            return undefined;
        pending ??= verifyBinding(context).then(() => {
            verified = true;
        }, (error) => {
            pending = undefined;
            throw error;
        });
        return pending;
    };
}
async function verifyBinding(context) {
    const data = await IndexerRead.gqlRequest(IndexedChainsQuery, {}, context);
    const rows = data.chain_metadata;
    if (!Array.isArray(rows))
        invalidBinding("data.chain_metadata", rows);
    const served = [];
    // Admit the entire selection before the owner can cache a successful binding,
    // even when an earlier row already names its chain.
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const path = `data.chain_metadata[${index}]`;
        if (!row || typeof row !== "object" || Array.isArray(row))
            invalidBinding(path, row);
        const chain = "chain_id" in row ? row.chain_id : undefined;
        if (chain === null)
            continue;
        // The served schema declares nullable Int, with no positive/id-domain constraint.
        if (typeof chain !== "number" || !Number.isInteger(chain) || chain < -2147483648 || chain > 2147483647) {
            invalidBinding(`${path}.chain_id`, chain);
        }
        served.push(chain);
    }
    if (served.includes(context.chainId))
        return;
    throw new NotConfiguredError(`an indexerUrl for chain ${context.chainId} (${context.url} indexes chains [${served.join(", ")}])`, `indexer reads on chain ${context.chainId}`);
}
function invalidBinding(path, value) {
    throw new IndexerError("IndexedChains", "invalid chain binding response", {
        cause: new TypeError(`invalid chain binding field: ${path}`, { cause: value }),
    });
}
/**
 *  Blocks an indexer may run ahead of the independent RPC head and still count
 *  as fresh. The indexer and the SDK read heads from different RPC nodes, so a
 *  small lead is normal. 10,000 blocks is 100 s on Hideki (10 ms blocks) and
 *  about 17 min on Shannon (100 ms blocks). A lead past it means the indexer
 *  processed blocks this chain does not have: it indexes an earlier genesis of
 *  the same chain id.
 */
const AHEAD_TOLERANCE_BLOCKS = 10000n;
/** {@link NotConfiguredError} for an indexer that is past the chain head by more than the tolerance. */
function aheadOfHead(chainId, processed, head) {
    return new NotConfiguredError(`an indexer on the current genesis of chain ${chainId} (processed ${processed}, RPC head ${head})`, `indexer data for chain ${chainId}`);
}
/**
 *  Indexer sync state from chain_metadata (the indexer's own view of head).
 *  Null if the indexer has no row for this chain; throws on request failure.
 */
export async function getSyncStatus(chainId, indexerUrl) {
    const data = await IndexerRead.gqlRequest(SyncStatusQuery, { chainId }, indexerUrl);
    const row = data.chain_metadata[0];
    if (!row)
        return null;
    return {
        // The row was selected BY chain_id, so it equals the argument — Hasura types
        // the column nullable (it has no notion of the filter), but a matched row
        // cannot carry a null here. Prefer the known argument over asserting.
        chainId,
        latestProcessedBlock: row.latest_processed_block,
        blockHeight: row.block_height,
        numEventsProcessed: row.num_events_processed,
    };
}
/** Default wait deadline: long enough to outlast ordinary indexing lag, short enough to surface a stall. */
const WAIT_TIMEOUT_MS = 30_000;
/** Default poll interval. See {@link WaitForIndexedBlockOptions.pollMs} for why it is not tighter. */
const WAIT_POLL_MS = 500;
/**
 *  Floor on the poll interval. The indexer is shared, so ten metadata reads a
 *  second is already generous for a wait whose subject moves at block cadence;
 *  below that a waiter is load rather than a reader.
 */
const MIN_POLL_MS = 100;
/**
 *  Ceiling on both millisecond options. `setTimeout` stores its delay in a
 *  signed 32-bit integer and fires IMMEDIATELY past that, so a larger value
 *  would turn a long wait into a hot loop instead of a long sleep.
 */
const MAX_DELAY_MS = 2_147_483_647;
/**
 *  Wait until the indexer has processed `block` on `chainId`.
 *
 *  The wait a caller needs between a confirmed write and an indexer read of that
 *  write: it polls `chain_metadata` and resolves once the processed height
 *  reaches the block, reporting how long that took and how far behind the
 *  indexer was when it started.
 *
 *  Resolving proves only that the indexer processed the BLOCK. Rows written by
 *  that block are visible to a read issued afterwards.
 *
 *  Throws {@link IndexerWaitTimeoutError} when the deadline passes with the
 *  indexer still behind — a different decision from a failed read, which stays
 *  {@link IndexerError}. A chain the indexer serves no metadata row for is also
 *  an {@link IndexerError}: waiting cannot produce a row for a chain this
 *  indexer does not index.
 *
 *  The owner's `readHead` reads the chain head once, when the wait would resolve. It
 *  returns null when the owner has no chain access, which skips the check. A
 *  processed height past that head by more than 10,000 blocks
 *  throws {@link NotConfiguredError}: the indexer follows an earlier genesis of
 *  the same chain id.
 */
export async function waitForIndexedBlock(chainId, block, opts = {}, indexerUrl) {
    const readHead = typeof indexerUrl !== "string" && "readHead" in indexerUrl ? indexerUrl.readHead : undefined;
    const targetBlock = IndexerRead.blockHeight(block, "block");
    const timeoutMs = opts.timeoutMs ?? WAIT_TIMEOUT_MS;
    const pollMs = opts.pollMs ?? WAIT_POLL_MS;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 0 || timeoutMs > MAX_DELAY_MS) {
        throw new InvalidInputError(`timeoutMs must be a whole number of milliseconds from 0 to ${MAX_DELAY_MS}`);
    }
    // A tighter interval would poll the shared indexer faster than its subject can
    // change, which is load rather than a faster wait.
    if (!Number.isSafeInteger(pollMs) || pollMs < MIN_POLL_MS || pollMs > MAX_DELAY_MS) {
        throw new InvalidInputError(`pollMs must be a whole number of milliseconds from ${MIN_POLL_MS} to ${MAX_DELAY_MS}`);
    }
    // The owner's configured signal governs every read it owns, and the per-call
    // signal is the caller's own (SDK-IO-003, SDK-OWN-004). Combining them here is
    // what makes closing the owner end a wait that named no signal of its own.
    const combined = GraphqlBoundary.linkSignals(typeof indexerUrl === "string" ? undefined : indexerUrl.signal, opts.signal);
    const signal = combined.signal;
    // A monotonic clock, not `Date.now()`: a deadline measured on wall time fires
    // early or late when the system clock is adjusted under a long wait.
    const startedAt = performance.now();
    let polls = 0;
    let initialLagBlocks = null;
    try {
        throwIfAborted(signal);
        for (;;) {
            const processed = await readProcessedBlock(chainId, indexerUrl, signal);
            throwIfAborted(signal);
            polls += 1;
            // A row that has processed nothing is lag from genesis, not an absent chain:
            // the indexer is configured for this chain and has yet to commit a batch.
            initialLagBlocks ??= Math.max(targetBlock - (processed ?? 0), 0);
            const waitedMs = Math.round(performance.now() - startedAt);
            if (processed !== null && processed >= targetBlock) {
                // One head read, only when the wait would resolve: an indexer ahead of
                // the chain has processed ANOTHER chain's block at this height, and
                // resolving would promise rows that no read will find.
                const head = readHead ? await readHead(signal) : null;
                throwIfAborted(signal);
                if (head !== null && BigInt(processed) > head + AHEAD_TOLERANCE_BLOCKS) {
                    throw aheadOfHead(chainId, BigInt(processed), head);
                }
                return { targetBlock, latestProcessedBlock: processed, initialLagBlocks, waitedMs, polls };
            }
            if (waitedMs >= timeoutMs) {
                throw new IndexerWaitTimeoutError(targetBlock, processed, timeoutMs, waitedMs, polls);
            }
            // Never sleep past the deadline: the next poll is the one that decides, so
            // an interval longer than the remaining time would report a late failure.
            await GraphqlBoundary.abortableDelay(Math.min(pollMs, timeoutMs - waitedMs), signal);
        }
    }
    finally {
        combined.dispose();
    }
}
/** Preserve abort-reason identity without requiring the optional native helper. */
function throwIfAborted(signal) {
    if (signal?.aborted)
        throw signal.reason;
}
/** The chain's processed height, or `null` when the row exists but has committed no batch. */
async function readProcessedBlock(chainId, indexerUrl, signal) {
    const data = await IndexerRead.gqlRequest(SyncStatusQuery, { chainId }, indexerUrl, undefined, { signal });
    const row = data.chain_metadata[0];
    if (!row)
        throw new IndexerError("waitForIndexedBlock", `no chain_metadata row for chain ${chainId}`);
    return row.latest_processed_block;
}
/** Internal independent observation using the owner-decorated boundary. */
export async function getIndependentHead(chainId, client, signal) {
    const block = await readBlock(client, { blockTag: "latest" }, signal);
    if (block.number === null)
        throw new RpcError("getBlock", "latest block has no height");
    return { chainId, blockNumber: block.number, timestamp: block.timestamp, observedAt: Date.now() };
}
/**
 *  Internal mixed-tier read. Missing metadata remains null; RPC failures throw.
 *  A processed height past the RPC head by more than 10,000 blocks
 *  throws {@link NotConfiguredError}: no lag can be measured against a chain the
 *  indexer is not following.
 */
export async function getIndexerFreshness(chainId, source, getClient) {
    if (chainId !== source.chainId)
        throw new InvalidInputError("chainId must match the configured owner");
    source.signal?.throwIfAborted();
    const metadata = await getSyncStatus(chainId, source);
    source.signal?.throwIfAborted();
    if (!metadata)
        return null;
    const client = getClient();
    const independentHead = await getIndependentHead(chainId, client, source.signal);
    const processed = metadata.latestProcessedBlock == null ? null : BigInt(metadata.latestProcessedBlock);
    let processedBlockTimestamp = null;
    let lagBlocks = null;
    let lagSeconds = null;
    if (processed !== null) {
        if (processed > independentHead.blockNumber + AHEAD_TOLERANCE_BLOCKS) {
            throw aheadOfHead(chainId, processed, independentHead.blockNumber);
        }
        lagBlocks = positive(independentHead.blockNumber - processed);
        processedBlockTimestamp =
            processed >= independentHead.blockNumber
                ? independentHead.timestamp
                : (await readBlock(client, { blockNumber: processed }, source.signal)).timestamp;
        lagSeconds = positive(independentHead.timestamp - processedBlockTimestamp);
    }
    const reportedLagBlocks = processed === null || metadata.blockHeight === null ? null : positive(BigInt(metadata.blockHeight) - processed);
    source.signal?.throwIfAborted();
    return {
        ...metadata,
        independentHead,
        processedBlockTimestamp,
        lagBlocks,
        lagSeconds,
        reportedLagBlocks,
        observedAt: Date.now(),
    };
}
function positive(value) {
    return value > 0n ? value : 0n;
}
/** Normalize block observations only; existing owner block reads retain their contract. */
export async function readBlock(client, args, signal) {
    signal?.throwIfAborted();
    try {
        const block = await client.getBlock(args);
        signal?.throwIfAborted();
        return block;
    }
    catch (cause) {
        signal?.throwIfAborted();
        if (cause instanceof SomniaMarketsError)
            throw cause;
        throw new RpcError("getBlock", "block observation failed", { cause });
    }
}
