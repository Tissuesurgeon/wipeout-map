import { type Abi, type Address, type Client, type Hex } from "viem";
/** A revert, named. */
export interface DecodedRevert {
    /** Human-readable, ready to show someone. */
    readonly reason: string;
    /** The raw bytes, for the cases no ABI here can name. */
    readonly raw: Hex;
}
/**
 *  Name the bytes a revert carried.
 *
 *  @param raw The revert data. `0x` for a revert with no reason at all.
 *  @param extra Additional error ABIs — a protocol's own, from the package that generates them.
 *  @returns The reason and the raw bytes. Never throws; an unknown selector is reported as one.
 */
export declare function decodeRevertData(raw: Hex, extra?: Abi): DecodedRevert;
/**
 *  Replay one call at a past block and decode whatever it reverts with.
 *
 *  @param client Any viem client that can read.
 *  @param tx The call to replay.
 *  @param blockNumber The block to replay against — the one the transaction landed in.
 *  @param extra Additional error ABIs.
 *  @returns The reason, or `null` when it did not revert or carried nothing to decode.
 */
export declare function replayForRevert(client: Client, tx: {
    from?: Address;
    to: Address;
    data: Hex;
    value?: bigint;
}, blockNumber: bigint, extra?: Abi): Promise<DecodedRevert | null>;
/**
 *  Why the transaction that landed in this block reverted.
 *
 *  **Replays the outer frame, and that this works at all depends on the Safe version.** On 1.3 and
 *  1.4 the failure branch was `require(success || safeTxGas != 0 || gasPrice != 0, "GS013")`,
 *  which REPLACED the inner revert data with an opaque string: replaying the wrapper reported
 *  `GS013` and told you nothing, and the only route to the real cause was replaying the inner call
 *  in isolation. Accounts here are 1.5.0, where the branch is instead
 *
 *  ```solidity
 *  assembly { returndatacopy(ptr, 0, returndatasize()); revert(ptr, returndatasize()) }
 *  ```
 *
 *  which propagates the inner data verbatim, and `MultiSend` does the same for the failing entry
 *  of a batch.
 *
 *  So the outer replay is the better one twice over: it reproduces the exact frame rather than an
 *  approximation, and it catches the failures that are the account's OWN — a spent nonce, or a
 *  signature from a non-owner — which are invisible in the inner call and appear here as `GS026`.
 *  Isolating one call out of a batch, by contrast, runs it without the others: an approve and the
 *  transfer that needs it replay to a plausible, wrong reason, and no reason beats a false one.
 *
 *  Best-effort and off the hot path: only ever run for a transaction that already failed, and a
 *  `null` simply means nothing better than "it reverted" can be said.
 *
 *  @param client Any viem client that can read.
 *  @param args.to Where the transaction went — the account, for an `execTransaction`.
 *  @param args.data The calldata that reverted.
 *  @param args.blockNumber The block it landed in.
 *  @param args.from The sender, when it matters.
 *  @param args.errors Additional error ABIs, for a protocol's own catalogue.
 *  @returns The reason, or `null`.
 */
export declare function revertReason(client: Client, args: {
    to: Address;
    data: Hex;
    blockNumber: bigint;
    from?: Address;
    errors?: Abi;
}): Promise<DecodedRevert | null>;
//# sourceMappingURL=revert.d.ts.map