import * as Errors from "./errors.js";
import { InvariantError } from "./raise.js";
import { IndexerError } from "./errors.js";
import * as SyncStatus from "./syncStatus.js";
/** Internal owner-derived capability factory; never exported at the package root. */
export async function createObservedReads(owner, bind, getClient) {
    owner.signal?.throwIfAborted();
    const independentHead = await SyncStatus.getIndependentHead(owner.chainId, getClient(), owner.signal);
    owner.signal?.throwIfAborted();
    const read = async (request) => {
        owner.signal?.throwIfAborted();
        const responses = [];
        const bindings = bind({
            ...owner,
            poolCache: new Map(),
            observe: (watermark, startedAt, completedAt) => responses.push({ watermark, startedAt, completedAt }),
        });
        // A discriminated request binds this exact method to its own parameter tuple; TS loses that correlation on indexed access.
        const invoke = bindings[request.operation];
        let data;
        try {
            data = await invoke(...request.args);
        }
        catch (error) {
            owner.signal?.throwIfAborted();
            // Completeness is a domain refusal, not one of the supported socket
            // failures. Preserve its paging recovery at this owning domain boundary.
            if (Errors.isErrorInstance(error, Errors.IncompletePortfolioError))
                throw error;
            // So is an indexer that predates position changes: its caller shows each
            // fill's own side rather than retrying a read that failed.
            if (Errors.isErrorInstance(error, Errors.PerpPositionChangesUnavailableError))
                throw error;
            const typed = Errors.sdkFailure(error, InvariantError);
            if (typed)
                throw typed;
            throw new IndexerError(request.operation, "domain response could not be read", { cause: error });
        }
        owner.signal?.throwIfAborted();
        let watermark = null;
        if (responses.length && responses.every((response) => response.watermark !== null)) {
            for (const response of responses)
                if (response.watermark !== null && (watermark === null || response.watermark < watermark))
                    watermark = response.watermark;
        }
        return {
            data,
            observation: {
                chainId: owner.chainId,
                latestProcessedBlock: watermark,
                startedAt: responses.length ? Math.min(...responses.map((r) => r.startedAt)) : null,
                completedAt: responses.length ? Math.max(...responses.map((r) => r.completedAt)) : null,
                responseCount: responses.length,
                independentHead,
            },
        };
    };
    const batch = async (requests) => {
        const results = await Promise.all(requests.map((request) => read(request)));
        // Promise.all preserves each input index, while Array.map erases the heterogeneous tuple relation.
        return results;
    };
    return { independentHead, read, batch };
}
