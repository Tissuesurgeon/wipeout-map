import * as IndexerRead from "../indexerRead.js";
import type { AccountSnapshotReader } from "./guardedSnapshot.js";
/** Whether an error message says the role refused the response because of its size. */
export declare function isResponseSizeRefusal(message: string): boolean;
export interface AccountViewReaderDeps {
    chainId: number;
    /** The owner's request context for account-view reads. */
    context: () => IndexerRead.RequestContext;
    /** The current time in nanoseconds. It becomes the expiry cutoff of a row read. */
    nowNs: () => bigint;
}
/** The current time on this machine, in nanoseconds. Order expiry follows this clock. */
export declare function nowNs(): bigint;
/**
 *  Builds the snapshot reader over the indexer's public GraphQL endpoint.
 *
 *  `signal` stops this reader's requests. The owner's own lifecycle signal travels in
 *  the request context.
 */
export declare function createSnapshotReader(deps: AccountViewReaderDeps, signal?: AbortSignal): AccountSnapshotReader;
