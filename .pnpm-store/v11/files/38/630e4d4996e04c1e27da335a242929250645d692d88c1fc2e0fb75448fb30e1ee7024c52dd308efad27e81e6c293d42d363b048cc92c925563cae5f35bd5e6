// The account view's indexer reads: the transport under the guarded snapshot.
//
// `guardedSnapshot.ts` decides what the reads mean. This module only sends them,
// through the shared indexer boundary (`indexerRead.ts`), so every read gets the
// owner's governor, binding check, timeout and cancellation. The reads send no
// `indexerHeaders`: the producer proves the account view's limits for the public
// role, and a privileged role would read under limits nobody measured.

import { IndexerError } from "../errors.js";
import * as IndexerRead from "../indexerRead.js";
import * as Documents from "./documents.js";
import type { AccountSnapshotReader } from "./guardedSnapshot.js";

/**
 *  Error messages that name the response size as the refused limit.
 *
 *  Copied from the producer's public-role probe
 *  (`indexer/scripts/probe-public-role-verdict.mjs`). HTTP 413 is absent on purpose:
 *  it refuses a request body, and these requests are a few hundred bytes.
 */
const RESPONSE_SIZE_REFUSAL = [
  /response\s+(is\s+)?too\s+large/i,
  /result\s+set\s+too\s+large/i,
  /query\s+result\s+.*too\s+large/i,
];

/** Error messages that name a row ceiling. A row refusal is never evidence about bytes. */
const ROW_LIMIT_REFUSAL = [/row\s+limit/i];

/** Whether an error message says the role refused the response because of its size. */
export function isResponseSizeRefusal(message: string): boolean {
  if (message.trim() === "") return false;
  if (ROW_LIMIT_REFUSAL.some((pattern) => pattern.test(message))) return false;
  return RESPONSE_SIZE_REFUSAL.some((pattern) => pattern.test(message));
}

/**
 *  Whether a deployment's schema has no account view at all.
 *
 *  Such a deployment answers `SnapshotVersion` with a GraphQL error that the capability
 *  or guard field is not found. That is a missing capability, not a failed read: the
 *  producer does not serve this view here. The count fallback in `indexerRead.ts`
 *  classifies a missing aggregate field the same way.
 */
function isNotServed(error: IndexerError): boolean {
  return /AccountCapability_by_pk|AccountSnapshotGuard_by_pk/.test(error.message) && /not\s+found/i.test(error.message);
}

export interface AccountViewReaderDeps {
  chainId: number;
  /** The owner's request context for account-view reads. */
  context: () => IndexerRead.RequestContext;
  /** The current time in nanoseconds. It becomes the expiry cutoff of a row read. */
  nowNs: () => bigint;
}

/** The current time on this machine, in nanoseconds. Order expiry follows this clock. */
export function nowNs(): bigint {
  return BigInt(Date.now()) * 1_000_000n;
}

/**
 *  Builds the snapshot reader over the indexer's public GraphQL endpoint.
 *
 *  `signal` stops this reader's requests. The owner's own lifecycle signal travels in
 *  the request context.
 */
export function createSnapshotReader(deps: AccountViewReaderDeps, signal?: AbortSignal): AccountSnapshotReader {
  const capabilityId = `${deps.chainId}:orders`;
  return {
    async readMarkers(account, datasetGeneration) {
      // Without a generation there is no guard id to ask for, and no guard row has an empty id.
      const guardId = datasetGeneration === null ? "" : `${datasetGeneration}:${account}`;
      try {
        const data = await IndexerRead.gqlRequest(
          Documents.SnapshotVersionQuery,
          { capabilityId, guardId },
          deps.context(),
          undefined,
          { signal },
        );
        return { capability: data.capability, guard: datasetGeneration === null ? undefined : data.guard };
      } catch (error) {
        if (error instanceof IndexerError && isNotServed(error)) return { capability: null, guard: null };
        throw error;
      }
    },
    async readRows(account, limits) {
      const expiryCutoffNs = deps.nowNs();
      // The role serves an oversized response whole, so the reader measures it and the
      // guarded snapshot checks it against the role's byte ceiling (`indexer/ACCOUNT-VIEW.md`).
      let responseBytes: number | undefined;
      try {
        const rows = await IndexerRead.gqlRequest(
          Documents.AccountOrderRowsQuery,
          {
            account,
            chainId: deps.chainId,
            orderLimit: limits.orders,
            stopLimit: limits.stops,
            nowNs: expiryCutoffNs.toString(),
          },
          deps.context(),
          undefined,
          {
            signal,
            onResponseBytes: (bytes) => {
              responseBytes = bytes;
            },
          },
        );
        // A read that returns has reported its size. Without one the ceiling cannot be
        // checked, so the read fails rather than pass unchecked.
        if (responseBytes === undefined)
          throw new IndexerError("AccountOrderRows", "the response size was not measured");
        return { status: "ok", rows, expiryCutoffNs, responseBytes };
      } catch (error) {
        if (error instanceof IndexerError && isResponseSizeRefusal(error.message)) return { status: "responseRefused" };
        throw error;
      }
    },
  };
}
