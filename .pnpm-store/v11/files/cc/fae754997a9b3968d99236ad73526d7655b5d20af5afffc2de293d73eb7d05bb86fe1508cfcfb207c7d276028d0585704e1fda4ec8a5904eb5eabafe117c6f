// Why a transaction reverted, recovered after the fact.
//
// **A receipt carries no revert data, in any Ethereum client and at any Safe version.** It says
// `status: 0` and nothing else. So a UI that has a failed transaction and wants to say anything
// beyond "it failed" has exactly one route: replay the call against the state of the block it
// landed in, catch the revert, and decode the bytes. Same state, same input, same revert.
//
// This lived in the explorer, where it was written carefully and then was unavailable to every
// other consumer — which is the shape of a capability that belongs in the SDK. It is
// protocol-independent by construction: Solidity's own two error types and OpenZeppelin's ERC-20
// set, and nothing else. A hand-transcribed table of some protocol's custom errors would drift in
// silence and then decode nothing, or worse, decode wrong; a consumer that wants its own errors
// named passes its ABI in.
import { decodeErrorResult, isHex, parseAbi, toHex, } from "viem";
/**
 *  What a revert can be named as without knowing the protocol.
 *
 *  `Error(string)` and `Panic(uint256)` are Solidity's own and cover a `require` with a message and
 *  an arithmetic fault. The ERC-20 errors are OpenZeppelin's, and they are here because they are
 *  **the failure a user hits most often** — a transfer an account cannot fund reverts inside the
 *  token, not inside whatever called it. Proven on chain: the underfunded case raises
 *  `ERC20InsufficientBalance(address,uint256,uint256)`, selector `0xe450d38c`, and without it a UI
 *  reports "Undecodable revert (0xe450d38c)" for the one revert whose cause is completely
 *  actionable — it carries the account, what it holds, and what was needed.
 */
const BASE_ERRORS = parseAbi([
    "error Error(string reason)",
    "error Panic(uint256 code)",
    "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
    "error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)",
    "error ERC20InvalidSender(address sender)",
    "error ERC20InvalidReceiver(address receiver)",
    "error ERC20InvalidApprover(address approver)",
    "error ERC20InvalidSpender(address spender)",
]);
/** The compiler's panic codes, which are unreadable as bare numbers. */
const PANIC_REASONS = {
    "0x01": "assertion failed",
    "0x11": "arithmetic overflow or underflow",
    "0x12": "division or modulo by zero",
    "0x21": "invalid enum value",
    "0x31": "pop on an empty array",
    "0x32": "array index out of bounds",
    "0x41": "out of memory",
    "0x51": "call to an uninitialized function",
};
/**
 *  Name the bytes a revert carried.
 *
 *  @param raw The revert data. `0x` for a revert with no reason at all.
 *  @param extra Additional error ABIs — a protocol's own, from the package that generates them.
 *  @returns The reason and the raw bytes. Never throws; an unknown selector is reported as one.
 */
export function decodeRevertData(raw, extra) {
    if (raw === "0x")
        return { reason: "Reverted without a reason string", raw };
    const abi = extra === undefined ? BASE_ERRORS : [...BASE_ERRORS, ...extra];
    try {
        const decoded = decodeErrorResult({ abi, data: raw });
        if (decoded.errorName === "Error")
            return { reason: String(decoded.args?.[0]), raw };
        if (decoded.errorName !== "Panic") {
            // A named custom error. Its arguments are the actionable part — an ERC-20 shortfall says
            // who, how much they hold and how much was needed — so they are rendered rather than
            // dropped for the name alone.
            const args = (decoded.args ?? []).map((a) => String(a)).join(", ");
            return { reason: args ? `${decoded.errorName}(${args})` : decoded.errorName, raw };
        }
        const code = toHex(decoded.args?.[0], { size: 1 });
        const known = PANIC_REASONS[code];
        return { reason: known === undefined ? `Panic(${code})` : `Panic: ${known}`, raw };
    }
    catch {
        // A custom error whose selector no ABI here knows. The selector at least lets someone look
        // it up, which beats "it failed".
        return { reason: `Undecodable revert (${raw.slice(0, 10)})`, raw };
    }
}
/**
 *  The revert bytes a JSON-RPC failure carries, wherever the provider hid them.
 *
 *  Walks the `cause` chain because every layer wraps: viem wraps the transport, the transport
 *  wraps the node's response, and the `data` field turns up at a different depth per provider.
 *  Guarded against a cycle, which a wrapped error can genuinely have.
 */
function revertDataFrom(error) {
    let cursor = error;
    const seen = new Set();
    while (typeof cursor === "object" && cursor !== null && !seen.has(cursor)) {
        seen.add(cursor);
        const data = cursor.data;
        if (typeof data === "string" && isHex(data))
            return data;
        if (typeof data === "object" && data !== null) {
            const nested = data.data;
            if (typeof nested === "string" && isHex(nested))
                return nested;
        }
        cursor = cursor.cause;
    }
    return null;
}
/**
 *  Replay one call at a past block and decode whatever it reverts with.
 *
 *  @param client Any viem client that can read.
 *  @param tx The call to replay.
 *  @param blockNumber The block to replay against — the one the transaction landed in.
 *  @param extra Additional error ABIs.
 *  @returns The reason, or `null` when it did not revert or carried nothing to decode.
 */
export async function replayForRevert(client, tx, blockNumber, extra) {
    try {
        await client.request({
            method: "eth_call",
            params: [
                {
                    ...(tx.from === undefined ? {} : { from: tx.from }),
                    to: tx.to,
                    data: tx.data,
                    ...(tx.value !== undefined && tx.value > 0n ? { value: toHex(tx.value) } : {}),
                },
                toHex(blockNumber),
            ],
        });
        return null;
    }
    catch (caught) {
        const raw = revertDataFrom(caught);
        return raw === null ? null : decodeRevertData(raw, extra);
    }
}
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
export async function revertReason(client, args) {
    return replayForRevert(client, { to: args.to, data: args.data, ...(args.from === undefined ? {} : { from: args.from }) }, args.blockNumber, args.errors);
}
//# sourceMappingURL=revert.js.map