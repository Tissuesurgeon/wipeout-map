// The account change stream follower.
//
// The producer publishes three subscription frames for the orders capability
// (`indexer/account-stream.graphql`): the chain's capability row, one account's guard,
// and that account's change batches in block order. The follower decides what each
// frame means for a reader that already holds an accepted version. It applies nothing
// itself; the session applies an `applied` verdict to the inventory.
//
// This is the SDK's port of `AccountStreamFollower` in
// `indexer/scripts/account-stream-lib.ts`. Every batch goes through the continuity
// classifier with the batch as its own guard: Envio writes a batch and its guard in
// one transaction, so a visible batch is its own guard at that block. What the stream
// adds is order. Each batch must name the accepted version as its predecessor, so a
// lost, reordered or pruned batch fails the next step as `predecessor_mismatch`.
import * as Continuity from "./continuity.js";
import * as Wire from "./wireSchemas.js";
function terminalOf(result) {
    switch (result.status) {
        case "retry_required":
            return { status: "retry_required", reason: result.reason };
        case "reset_required":
            return { status: "reset_required", reason: result.reason };
        case "source_unavailable":
            return result;
    }
}
/**
 *  Follows one chain-and-account orders stream from an accepted guarded snapshot.
 *
 *  Feed it every capability frame, guard frame and batch (with its complete children)
 *  in arrival order. The first terminal verdict is final: every later call returns it
 *  again, because nothing after a loss can be applied safely.
 */
export class AccountStreamFollower {
    scope;
    accepted;
    /** Versions this reader accepted, newest last, so a redelivered batch is not a conflict. */
    history = [];
    target;
    behind = false;
    terminal;
    constructor(scope) {
        this.scope = scope;
        this.accepted = scope.version;
        this.remember(scope.version);
    }
    get version() {
        return this.accepted;
    }
    /** The newest guard version the stream has not delivered yet, if any. */
    get pendingTarget() {
        return this.target;
    }
    /**
     *  Whether the last guard frame was below the accepted version.
     *
     *  A live-query frame computed before the stream's newer batch can arrive after it.
     *  Hasura then sends the newer guard at its next poll. A rollback sends no such
     *  correction, so the session waits a bounded time and then takes a new snapshot.
     */
    get guardBehind() {
        return this.behind;
    }
    get failure() {
        return this.terminal;
    }
    /** An `AccountCapabilityWatch` frame. Any change to the row the snapshot used ends the view. */
    onCapability(raw) {
        if (this.terminal)
            return this.terminal;
        if (raw == null)
            return this.end(Continuity.unavailable("capability_missing"));
        const head = Wire.wireCapabilityHeadSchema.safeParse(raw);
        if (!head.success)
            return this.end(Continuity.unavailable("invalid_response"));
        if (head.data.contractVersion !== Continuity.CONTRACT_VERSION) {
            return this.end(Continuity.unavailable("unsupported_contract_version"));
        }
        if (head.data.readiness === "UNAVAILABLE") {
            return this.end(Continuity.unavailable("capability_unavailable", Continuity.unavailableReasonOf(raw)));
        }
        if (head.data.readiness !== "READY")
            return this.end(Continuity.unavailable("invalid_response"));
        const capability = Wire.wireCapabilitySchema.safeParse(raw);
        if (!capability.success)
            return this.end(Continuity.unavailable("invalid_response"));
        if (capability.data.datasetGeneration !== this.accepted.datasetGeneration) {
            return this.end({ status: "reset_required", reason: "generation_changed" });
        }
        if (!Wire.sameCapability(capability.data, this.scope.capability)) {
            return this.end({ status: "reset_required", reason: "capability_changed" });
        }
        return { status: "current" };
    }
    /** An `AccountGuardWatch` frame: the account's newest committed version. */
    onGuard(raw) {
        if (this.terminal)
            return this.terminal;
        const generation = this.accepted.datasetGeneration;
        // Only a real `null` is "no guard". A frame without a guard row at all is broken,
        // and the schema check below reports it as `invalid_response`.
        if (raw === null) {
            // No guard is the zero version. Above it, the frame is behind: late or rolled back.
            if (Continuity.isZeroVersion(this.accepted))
                return this.caughtUp({ status: "current" });
            this.behind = true;
            return { status: "guard_behind" };
        }
        const parsed = Wire.wireGuardSchema.safeParse(raw);
        if (!parsed.success)
            return this.end(Continuity.unavailable("invalid_response"));
        const guard = parsed.data;
        if (guard.id !== `${generation}:${this.scope.account}` ||
            guard.account !== this.scope.account ||
            guard.datasetGeneration !== generation) {
            return this.end(Continuity.unavailable("scope_mismatch"));
        }
        const version = Continuity.versionOf(guard, generation);
        if (Continuity.sameVersion(version, this.accepted))
            return this.caughtUp({ status: "current" });
        const block = BigInt(version.blockNumber);
        const held = BigInt(this.accepted.blockNumber);
        // Only the accepted version ever existed at the accepted height in this reader's
        // history, so a different one there was written over it.
        if (block === held)
            return this.end({ status: "reset_required", reason: "version_conflict" });
        if (block < held) {
            this.behind = true;
            return { status: "guard_behind" };
        }
        this.target = version;
        return this.caughtUp({ status: "pending", target: version });
    }
    /** One `AccountChangeBatchStream` row with the complete `AccountChangeChildren` response for it. */
    onBatch(raw, orderChanges, stopChanges) {
        if (this.terminal)
            return this.terminal;
        const parsed = Wire.wireBatchSchema.safeParse(raw);
        if (!parsed.success)
            return this.end(Continuity.unavailable("invalid_response"));
        const batch = parsed.data;
        const account = this.scope.account;
        // Scope first, so a foreign row is never mistaken for a duplicate or a conflict.
        if (batch.account !== account ||
            batch.datasetGeneration !== this.accepted.datasetGeneration ||
            batch.id !== `${batch.datasetGeneration}:${account}:${batch.blockNumber}`) {
            return this.end(Continuity.unavailable("scope_mismatch"));
        }
        if (BigInt(batch.blockNumber) <= BigInt(this.accepted.blockNumber)) {
            // A reconnect that restarts the cursor too early redelivers what the reader holds.
            const version = Continuity.versionOf(batch, batch.datasetGeneration);
            if (this.known(version))
                return { status: "duplicate" };
            return this.end({ status: "reset_required", reason: "version_conflict" });
        }
        const result = Continuity.classifyAccountContinuity({
            chainId: this.scope.chainId,
            account,
            capability: this.scope.capability,
            previous: this.accepted,
            pinnedBatchId: batch.id,
            guard: {
                id: `${this.accepted.datasetGeneration}:${account}`,
                account: batch.account,
                datasetGeneration: batch.datasetGeneration,
                blockNumber: batch.blockNumber,
                blockHash: batch.blockHash,
                digest: batch.digest,
            },
            batch: raw,
            orderChanges,
            stopChanges,
            // A committed batch row is evidence that its own block was processed. A height
            // above the GraphQL Int range is the classifier's `invalid_response`.
            processedHeight: Number(batch.blockNumber),
        });
        if (result.status !== "usable")
            return this.end(terminalOf(result));
        // The guard and the stream arrive independently. A batch at the guard's height must
        // be the exact version the guard certified; only a strictly newer batch supersedes it.
        if (this.target !== undefined &&
            this.target.blockNumber === result.version.blockNumber &&
            !Continuity.sameVersion(this.target, result.version)) {
            return this.end({ status: "reset_required", reason: "version_conflict" });
        }
        this.accepted = result.version;
        this.remember(result.version);
        if (this.target !== undefined && BigInt(this.target.blockNumber) <= BigInt(result.version.blockNumber)) {
            this.target = undefined;
        }
        return {
            status: "applied",
            version: result.version,
            orderChanges: result.orderChanges,
            stopChanges: result.stopChanges,
        };
    }
    /** A reader that stops receiving frames reports its own loss; the producer cannot see it. */
    onDisconnect() {
        if (this.terminal)
            return this.terminal;
        return this.end({ status: "reset_required", reason: "snapshot_required" });
    }
    caughtUp(verdict) {
        this.behind = false;
        return verdict;
    }
    known(version) {
        return this.history.some((held) => Continuity.sameVersion(held, version));
    }
    remember(version) {
        this.history.push(version);
        // One retention window is enough to recognise any batch the producer can still
        // redeliver. Older ones are pruned by the producer too.
        if (this.history.length > this.scope.capability.retentionBatches + 1)
            this.history.shift();
    }
    end(verdict) {
        this.terminal = verdict;
        this.target = undefined;
        this.behind = false;
        return verdict;
    }
}
