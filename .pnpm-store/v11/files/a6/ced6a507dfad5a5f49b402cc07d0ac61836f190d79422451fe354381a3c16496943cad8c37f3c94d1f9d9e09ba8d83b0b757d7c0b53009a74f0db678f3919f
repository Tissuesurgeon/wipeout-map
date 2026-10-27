import type { PublicClient } from "viem";
import * as IndexerRead from "./indexerRead.js";
/**
 *  The indexer's own sync state for one chain (envio `chain_metadata`). These self-reported
 *  heights can freeze together. Use IndexerFreshness for independent lag.
 *
 * @category indexing
 */
export type IndexerSyncStatus = {
    /** Chain id the row describes. */
    chainId: number;
    /** Last block the indexer fully processed; null before the first block lands. */
    latestProcessedBlock: number | null;
    /** Chain head height as the indexer last saw it; null until first fetched. */
    blockHeight: number | null;
    /**
     *  Lifetime count of events the indexer has processed on this chain. `null` on
     *  the rare row where envio has not populated the counter yet — Hasura declares
     *  the column nullable, so this is the wire's shape, not a defensive guess.
     */
    numEventsProcessed: number | null;
};
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
export declare function makeBindingCheck(context: IndexerRead.RequestContext): () => Promise<void> | undefined;
/**
 *  Indexer sync state from chain_metadata (the indexer's own view of head).
 *  Null if the indexer has no row for this chain; throws on request failure.
 */
export declare function getSyncStatus(chainId: number, indexerUrl: IndexerRead.Source): Promise<IndexerSyncStatus | null>;
/**
 * Options for {@link SomniaMarketsClient.waitForIndexedBlock}. All optional.
 *
 * @category indexing
 */
export type WaitForIndexedBlockOptions = {
    /**
     *  Give up after this many milliseconds (default 30,000).
     *
     *  The deadline is checked between polls, so the wait performs at least one
     *  read even at 0, and a metadata request already in flight is allowed to
     *  finish and decide: a reply that arrives late but reports the block as
     *  processed resolves rather than failing.
     */
    timeoutMs?: number;
    /**
     *  Milliseconds between polls (default 500, minimum 100). Each poll is one
     *  small `chain_metadata` read, and several waiters share one indexer — 500ms
     *  keeps a waiting client at two requests per second while staying well inside
     *  the indexing delay it is waiting on.
     */
    pollMs?: number;
    /**
     *  Abort the wait. The caller's own abort reason is rethrown unchanged, and
     *  the owner's configured signal aborts it as well — whichever fires first.
     */
    signal?: AbortSignal;
};
/**
 *  What a completed {@link SomniaMarketsClient.waitForIndexedBlock} observed.
 *
 * @category indexing
 */
export type IndexedBlockWait = {
    /** Block the caller waited for. */
    readonly targetBlock: number;
    /** Processed height when the wait cleared; at or above `targetBlock`. */
    readonly latestProcessedBlock: number;
    /**
     *  Blocks the indexer was short of the target at the FIRST poll, floored at
     *  zero — the lag the wait actually had to absorb. A chain row that had
     *  processed nothing counts as lag from block 0.
     */
    readonly initialLagBlocks: number;
    /**
     *  Elapsed milliseconds from starting the wait through the metadata reply
     *  that cleared it, including the first request's latency.
     */
    readonly waitedMs: number;
    /** Metadata reads performed, including the one that cleared the wait. */
    readonly polls: number;
};
/**
 *  The indexer a wait polls. An owner adds `readHead` when the wait is for its
 *  own chain; it returns the RPC head, or null when the owner has no chain access.
 */
export type WaitSource = IndexerRead.Source | (IndexerRead.RequestContext & {
    readonly readHead?: (signal?: AbortSignal) => Promise<bigint | null>;
});
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
export declare function waitForIndexedBlock(chainId: number, block: number | bigint, opts: WaitForIndexedBlockOptions | undefined, indexerUrl: WaitSource): Promise<IndexedBlockWait>;
/** Independent chain observation shared by a group of reads. It is not a snapshot pin. */
export interface IndependentHead {
    /** Owner chain. */
    readonly chainId: number;
    /** Latest height returned by the owner's RPC. */
    readonly blockNumber: bigint;
    /** Block time in Unix seconds. */
    readonly timestamp: bigint;
    /** Wall-clock time at RPC completion, in milliseconds. */
    readonly observedAt: number;
}
/** Indexer metadata compared to an independently requested chain head. */
export type IndexerFreshness = IndexerSyncStatus & {
    /** Independent RPC observation. RPC recency itself is not asserted. */
    readonly independentHead: IndependentHead;
    /** Processed block's Unix time; null when the processed height is unknown. */
    readonly processedBlockTimestamp: bigint | null;
    /**
     *  Independent head minus processed height, clamped to zero. A lead within
     *  10,000 blocks reads as zero; past that the read throws instead.
     */
    readonly lagBlocks: bigint | null;
    /** Difference between chain timestamps in seconds, clamped to zero. */
    readonly lagSeconds: bigint | null;
    /** Indexer's own reported head minus processed height, clamped to zero. */
    readonly reportedLagBlocks: bigint | null;
    /** Wall-clock completion time in milliseconds. */
    readonly observedAt: number;
};
/** Internal independent observation using the owner-decorated boundary. */
export declare function getIndependentHead(chainId: number, client: PublicClient, signal?: AbortSignal): Promise<IndependentHead>;
/**
 *  Internal mixed-tier read. Missing metadata remains null; RPC failures throw.
 *  A processed height past the RPC head by more than 10,000 blocks
 *  throws {@link NotConfiguredError}: no lag can be measured against a chain the
 *  indexer is not following.
 */
export declare function getIndexerFreshness(chainId: number, source: IndexerRead.RequestContext, getClient: () => PublicClient): Promise<IndexerFreshness | null>;
/** Normalize block observations only; existing owner block reads retain their contract. */
export declare function readBlock(client: PublicClient, args: Parameters<PublicClient["getBlock"]>[0], signal?: AbortSignal): Promise<{
    number: bigint | null;
    blobGasUsed: bigint;
    gasUsed: bigint;
    logsBloom: `0x${string}` | null;
    nonce: `0x${string}` | null;
    hash: `0x${string}` | null;
    size: bigint;
    timestamp: bigint;
    baseFeePerGas: bigint | null;
    difficulty: bigint;
    excessBlobGas: bigint;
    extraData: import("viem").Hex;
    gasLimit: bigint;
    miner: import("viem").Address;
    mixHash: import("viem").Hash;
    parentBeaconBlockRoot?: `0x${string}` | undefined;
    parentHash: import("viem").Hash;
    receiptsRoot: import("viem").Hex;
    sealFields: import("viem").Hex[];
    sha3Uncles: import("viem").Hash;
    stateRoot: import("viem").Hash;
    totalDifficulty: bigint | null;
    transactionsRoot: import("viem").Hash;
    uncles: import("viem").Hash[];
    withdrawals?: import("viem").Withdrawal[] | undefined | undefined;
    withdrawalsRoot?: `0x${string}` | undefined;
    transactions: `0x${string}`[] | ({
        chainId?: number | undefined;
        v: bigint;
        value: bigint;
        type: "legacy";
        blockTimestamp?: bigint | undefined;
        from: import("viem").Address;
        to: import("viem").Address | null;
        r: import("viem").Hex;
        s: import("viem").Hex;
        yParity?: undefined | undefined;
        gas: bigint;
        nonce: number;
        blobVersionedHashes?: undefined | undefined;
        gasPrice: bigint;
        maxFeePerBlobGas?: undefined | undefined;
        maxFeePerGas?: undefined | undefined;
        maxPriorityFeePerGas?: undefined | undefined;
        accessList?: undefined | undefined;
        authorizationList?: undefined | undefined;
        hash: import("viem").Hash;
        input: import("viem").Hex;
        typeHex: import("viem").Hex | null;
        blockHash: `0x${string}` | null;
        blockNumber: bigint | null;
        transactionIndex: number | null;
    } | {
        chainId: number;
        v: bigint;
        value: bigint;
        type: "eip2930";
        blockTimestamp?: bigint | undefined;
        from: import("viem").Address;
        to: import("viem").Address | null;
        r: import("viem").Hex;
        s: import("viem").Hex;
        yParity: number;
        gas: bigint;
        nonce: number;
        blobVersionedHashes?: undefined | undefined;
        gasPrice: bigint;
        maxFeePerBlobGas?: undefined | undefined;
        maxFeePerGas?: undefined | undefined;
        maxPriorityFeePerGas?: undefined | undefined;
        accessList: import("viem").AccessList;
        authorizationList?: undefined | undefined;
        hash: import("viem").Hash;
        input: import("viem").Hex;
        typeHex: import("viem").Hex | null;
        blockHash: `0x${string}` | null;
        blockNumber: bigint | null;
        transactionIndex: number | null;
    } | {
        chainId: number;
        v: bigint;
        value: bigint;
        type: "eip1559";
        blockTimestamp?: bigint | undefined;
        from: import("viem").Address;
        to: import("viem").Address | null;
        r: import("viem").Hex;
        s: import("viem").Hex;
        yParity: number;
        gas: bigint;
        nonce: number;
        blobVersionedHashes?: undefined | undefined;
        gasPrice?: undefined | undefined;
        maxFeePerBlobGas?: undefined | undefined;
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
        accessList: import("viem").AccessList;
        authorizationList?: undefined | undefined;
        hash: import("viem").Hash;
        input: import("viem").Hex;
        typeHex: import("viem").Hex | null;
        blockHash: `0x${string}` | null;
        blockNumber: bigint | null;
        transactionIndex: number | null;
    } | {
        chainId: number;
        v: bigint;
        value: bigint;
        type: "eip4844";
        blockTimestamp?: bigint | undefined;
        from: import("viem").Address;
        to: import("viem").Address | null;
        r: import("viem").Hex;
        s: import("viem").Hex;
        yParity: number;
        gas: bigint;
        nonce: number;
        blobVersionedHashes: readonly import("viem").Hex[];
        gasPrice?: undefined | undefined;
        maxFeePerBlobGas: bigint;
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
        accessList: import("viem").AccessList;
        authorizationList?: undefined | undefined;
        hash: import("viem").Hash;
        input: import("viem").Hex;
        typeHex: import("viem").Hex | null;
        blockHash: `0x${string}` | null;
        blockNumber: bigint | null;
        transactionIndex: number | null;
    } | {
        chainId: number;
        v: bigint;
        value: bigint;
        type: "eip7702";
        blockTimestamp?: bigint | undefined;
        from: import("viem").Address;
        to: import("viem").Address | null;
        r: import("viem").Hex;
        s: import("viem").Hex;
        yParity: number;
        gas: bigint;
        nonce: number;
        blobVersionedHashes?: undefined | undefined;
        gasPrice?: undefined | undefined;
        maxFeePerBlobGas?: undefined | undefined;
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
        accessList: import("viem").AccessList;
        authorizationList: import("viem").SignedAuthorizationList;
        hash: import("viem").Hash;
        input: import("viem").Hex;
        typeHex: import("viem").Hex | null;
        blockHash: `0x${string}` | null;
        blockNumber: bigint | null;
        transactionIndex: number | null;
    })[];
}>;
