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
import type { AccountContinuityResult, AccountResetReason, AccountUnavailable, ReadyCapability } from "./continuity.js";
import type { WireOrderChange, WireStopChange, WireVersion } from "./wireSchemas.js";

export type StreamResetReason = AccountResetReason | "capability_changed";

/** A verdict after which nothing can be applied. The caller takes a new snapshot. */
export type StreamTerminal =
  | { status: "reset_required"; reason: StreamResetReason }
  | AccountUnavailable
  | { status: "retry_required"; reason: "stale_pin" };

/**
 *  What one frame means.
 *
 *  - `applied`: a batch advanced the accepted version; apply its changes.
 *  - `duplicate`: a batch the reader already holds; nothing to do.
 *  - `pending`: the guard is ahead of the accepted version; the stream owes batches up to `target`.
 *  - `current`: the frame agrees with what the reader holds.
 *  - `guard_behind`: the guard is below the accepted version. A late frame is corrected
 *    by a newer one; a rollback is not, so the reader resets if it stays behind.
 *  - a terminal verdict: discard the view and take a new guarded snapshot.
 */
export type StreamVerdict =
  | {
      status: "applied";
      version: WireVersion;
      orderChanges: readonly WireOrderChange[];
      stopChanges: readonly WireStopChange[];
    }
  | { status: "duplicate" }
  | { status: "pending"; target: WireVersion }
  | { status: "current" }
  | { status: "guard_behind" }
  | StreamTerminal;

export interface StreamScope {
  chainId: number;
  /** The account, lower-cased. */
  account: string;
  /** The READY capability the snapshot was accepted under. */
  capability: ReadyCapability;
  /** The accepted snapshot's version: the zero version for an account with no guard. */
  version: WireVersion;
}

function terminalOf(result: Exclude<AccountContinuityResult, { status: "usable" }>): StreamTerminal {
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
  private accepted: WireVersion;
  /** Versions this reader accepted, newest last, so a redelivered batch is not a conflict. */
  private readonly history: WireVersion[] = [];
  private target: WireVersion | undefined;
  private behind = false;
  private terminal: StreamTerminal | undefined;

  constructor(private readonly scope: StreamScope) {
    this.accepted = scope.version;
    this.remember(scope.version);
  }

  get version(): WireVersion {
    return this.accepted;
  }

  /** The newest guard version the stream has not delivered yet, if any. */
  get pendingTarget(): WireVersion | undefined {
    return this.target;
  }

  /**
   *  Whether the last guard frame was below the accepted version.
   *
   *  A live-query frame computed before the stream's newer batch can arrive after it.
   *  Hasura then sends the newer guard at its next poll. A rollback sends no such
   *  correction, so the session waits a bounded time and then takes a new snapshot.
   */
  get guardBehind(): boolean {
    return this.behind;
  }

  get failure(): StreamTerminal | undefined {
    return this.terminal;
  }

  /** An `AccountCapabilityWatch` frame. Any change to the row the snapshot used ends the view. */
  onCapability(raw: unknown): StreamVerdict {
    if (this.terminal) return this.terminal;
    if (raw == null) return this.end(Continuity.unavailable("capability_missing"));
    const head = Wire.wireCapabilityHeadSchema.safeParse(raw);
    if (!head.success) return this.end(Continuity.unavailable("invalid_response"));
    if (head.data.contractVersion !== Continuity.CONTRACT_VERSION) {
      return this.end(Continuity.unavailable("unsupported_contract_version"));
    }
    if (head.data.readiness === "UNAVAILABLE") {
      return this.end(Continuity.unavailable("capability_unavailable", Continuity.unavailableReasonOf(raw)));
    }
    if (head.data.readiness !== "READY") return this.end(Continuity.unavailable("invalid_response"));
    const capability = Wire.wireCapabilitySchema.safeParse(raw);
    if (!capability.success) return this.end(Continuity.unavailable("invalid_response"));
    if (capability.data.datasetGeneration !== this.accepted.datasetGeneration) {
      return this.end({ status: "reset_required", reason: "generation_changed" });
    }
    if (!Wire.sameCapability(capability.data, this.scope.capability)) {
      return this.end({ status: "reset_required", reason: "capability_changed" });
    }
    return { status: "current" };
  }

  /** An `AccountGuardWatch` frame: the account's newest committed version. */
  onGuard(raw: unknown): StreamVerdict {
    if (this.terminal) return this.terminal;
    const generation = this.accepted.datasetGeneration;
    // Only a real `null` is "no guard". A frame without a guard row at all is broken,
    // and the schema check below reports it as `invalid_response`.
    if (raw === null) {
      // No guard is the zero version. Above it, the frame is behind: late or rolled back.
      if (Continuity.isZeroVersion(this.accepted)) return this.caughtUp({ status: "current" });
      this.behind = true;
      return { status: "guard_behind" };
    }
    const parsed = Wire.wireGuardSchema.safeParse(raw);
    if (!parsed.success) return this.end(Continuity.unavailable("invalid_response"));
    const guard = parsed.data;
    if (
      guard.id !== `${generation}:${this.scope.account}` ||
      guard.account !== this.scope.account ||
      guard.datasetGeneration !== generation
    ) {
      return this.end(Continuity.unavailable("scope_mismatch"));
    }
    const version = Continuity.versionOf(guard, generation);
    if (Continuity.sameVersion(version, this.accepted)) return this.caughtUp({ status: "current" });
    const block = BigInt(version.blockNumber);
    const held = BigInt(this.accepted.blockNumber);
    // Only the accepted version ever existed at the accepted height in this reader's
    // history, so a different one there was written over it.
    if (block === held) return this.end({ status: "reset_required", reason: "version_conflict" });
    if (block < held) {
      this.behind = true;
      return { status: "guard_behind" };
    }
    this.target = version;
    return this.caughtUp({ status: "pending", target: version });
  }

  /** One `AccountChangeBatchStream` row with the complete `AccountChangeChildren` response for it. */
  onBatch(raw: unknown, orderChanges: readonly unknown[], stopChanges: readonly unknown[]): StreamVerdict {
    if (this.terminal) return this.terminal;
    const parsed = Wire.wireBatchSchema.safeParse(raw);
    if (!parsed.success) return this.end(Continuity.unavailable("invalid_response"));
    const batch = parsed.data;
    const account = this.scope.account;
    // Scope first, so a foreign row is never mistaken for a duplicate or a conflict.
    if (
      batch.account !== account ||
      batch.datasetGeneration !== this.accepted.datasetGeneration ||
      batch.id !== `${batch.datasetGeneration}:${account}:${batch.blockNumber}`
    ) {
      return this.end(Continuity.unavailable("scope_mismatch"));
    }
    if (BigInt(batch.blockNumber) <= BigInt(this.accepted.blockNumber)) {
      // A reconnect that restarts the cursor too early redelivers what the reader holds.
      const version = Continuity.versionOf(batch, batch.datasetGeneration);
      if (this.known(version)) return { status: "duplicate" };
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
    if (result.status !== "usable") return this.end(terminalOf(result));
    // The guard and the stream arrive independently. A batch at the guard's height must
    // be the exact version the guard certified; only a strictly newer batch supersedes it.
    if (
      this.target !== undefined &&
      this.target.blockNumber === result.version.blockNumber &&
      !Continuity.sameVersion(this.target, result.version)
    ) {
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
  onDisconnect(): StreamVerdict {
    if (this.terminal) return this.terminal;
    return this.end({ status: "reset_required", reason: "snapshot_required" });
  }

  private caughtUp(verdict: StreamVerdict): StreamVerdict {
    this.behind = false;
    return verdict;
  }

  private known(version: WireVersion): boolean {
    return this.history.some((held) => Continuity.sameVersion(held, version));
  }

  private remember(version: WireVersion): void {
    this.history.push(version);
    // One retention window is enough to recognise any batch the producer can still
    // redeliver. Older ones are pruned by the producer too.
    if (this.history.length > this.scope.capability.retentionBatches + 1) this.history.shift();
  }

  private end(verdict: StreamTerminal): StreamTerminal {
    this.terminal = verdict;
    this.target = undefined;
    this.behind = false;
    return verdict;
  }
}
