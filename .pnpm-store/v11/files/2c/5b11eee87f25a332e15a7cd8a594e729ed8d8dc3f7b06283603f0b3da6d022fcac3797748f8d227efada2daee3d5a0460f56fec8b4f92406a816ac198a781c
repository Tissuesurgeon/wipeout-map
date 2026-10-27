// Moving value between accounts.
//
// Nothing here is specific to sub-accounts, and that is the point: an account is an account, so
// funding one from another is the same operation in both directions and only `from` changes. The
// direction is the part that gets mixed up — a transfer executed by the wrong account either
// reverts for want of balance or, worse, succeeds and moves somebody else's money — so the plan
// builders below take `from` and `to` rather than a list of calls and a hope.
//
// An account's balance is its own. There is no shared pool between a main account and its
// sub-accounts, no sweep, and no implicit funding: a sub-account starts empty, and value arrives
// because someone executed a transfer into it.
import { encodeFunctionData, getAddress } from "viem";
import { getBalance, readContract } from "viem/actions";
import { erc20Abi } from "./abi/generated/index.js";
import { planExecution, readExecutionPlan } from "./execute.js";
import { InvalidInputError } from "./errors.js";
/**
 *  Send native value.
 *
 *  A bare value transfer with no calldata, which is what a Safe does when `data` is empty. The
 *  recipient's fallback still runs, so this can fail for a contract that rejects native value —
 *  including, in principle, another account. Ours accept it.
 *
 *  @param to The recipient.
 *  @param amount Wei.
 *  @returns The call, to be executed BY the account holding the funds.
 */
export function nativeTransferCall(to, amount) {
    return { to: getAddress(to), value: amount, data: "0x" };
}
/**
 *  Send an ERC-20 balance.
 *
 *  `transfer`, not `transferFrom`: the executing account is the holder, so no allowance is
 *  involved and nothing has to be approved first. That is worth knowing because the alternative —
 *  approving a spender and having it pull — is two transactions and a standing allowance, and it
 *  is what a caller reaches for out of habit.
 *
 *  **The return value is not checked.** Safe's `execTransaction` reverts when the inner call
 *  reverts, so a token that reverts on failure is handled; a token that returns `false` instead is
 *  not, and there is no way to check from here without a wrapper contract. Somnia's tokens revert.
 *
 *  @param token The token contract.
 *  @param to The recipient.
 *  @param amount Raw units.
 *  @returns The call, to be executed BY the account holding the balance.
 */
export function erc20TransferCall(token, to, amount) {
    return {
        to: getAddress(token),
        value: 0n,
        data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [getAddress(to), amount],
        }),
    };
}
/**
 *  Every call needed to move a mixed set of value to one recipient.
 *
 *  Native first, then each token in the order given. Several calls become one Safe transaction
 *  through `MultiSendCallOnly`, so the whole move lands or none of it does — which is the
 *  difference between "funded the sub-account" and "sent it the gas but not the tokens".
 *
 *  @param args.to The recipient.
 *  @param args.native Wei. Omit or pass `0n` for none.
 *  @param args.tokens ERC-20 amounts.
 *  @returns The calls, in order.
 *  @throws {InvalidInputError} When nothing was asked for, which would otherwise encode a signature over
 *          an empty transaction.
 */
export function transferCalls(args) {
    const calls = [];
    if (args.native !== undefined && args.native > 0n) {
        calls.push(nativeTransferCall(args.to, args.native));
    }
    for (const { token, amount } of args.tokens ?? []) {
        calls.push(erc20TransferCall(token, args.to, amount));
    }
    if (calls.length === 0) {
        throw new InvalidInputError("A transfer needs a native amount, at least one token, or both.");
    }
    return calls;
}
/**
 *  Plan a transfer out of one account into another.
 *
 *  **`from` is the account that executes**, so it is the one whose balance moves and whose nonce
 *  and authority chain are used. Moving value from a main account into a sub-account and moving it
 *  back are the same call with the two swapped — but they are not the same *authority*: the main
 *  account is usually reachable by a key directly, while a sub-account is reached through it, so
 *  the return trip needs `through: [mainAccount]`.
 *
 *  @param args.chainId EIP-155 chain id.
 *  @param args.from The account holding the value. It executes.
 *  @param args.to The recipient.
 *  @param args.native Wei to move.
 *  @param args.tokens ERC-20 amounts to move.
 *  @param args.nonce `from`'s current nonce.
 *  @param args.through The accounts between the signer and `from`, nearest first.
 *  @param args.saltVersion Which salt version, when a chain has more than one committed.
 *  @returns The plan, whose `hash` is what the key signs.
 */
export function planTransfer(args) {
    return planExecution({
        chainId: args.chainId,
        account: args.from,
        calls: transferCalls(args),
        nonce: args.nonce,
        ...(args.through === undefined ? {} : { through: args.through }),
        ...(args.saltVersion === undefined ? {} : { saltVersion: args.saltVersion }),
    });
}
/**
 *  {@link planTransfer}, reading `from`'s nonce.
 *
 *  @param client Any viem client that can read.
 *  @param args As {@link planTransfer}, without the nonce.
 *  @returns The plan.
 */
export async function readTransferPlan(client, args) {
    return readExecutionPlan(client, {
        chainId: args.chainId,
        account: args.from,
        calls: transferCalls(args),
        ...(args.through === undefined ? {} : { through: args.through }),
        ...(args.saltVersion === undefined ? {} : { saltVersion: args.saltVersion }),
    });
}
/**
 *  What a token calls itself, and how it counts.
 *
 *  **Never default `decimals` to 18.** A balance shown with the wrong scale is off by orders of
 *  magnitude in the direction nobody checks, and USDC-style six-decimal tokens are common enough
 *  that the guess is wrong regularly. `undefined` means "ask the user to confirm the raw amount",
 *  which is ugly and correct.
 *
 *  @param client Any viem client that can read.
 *  @param token The token contract.
 *  @returns Its symbol and decimals, each `undefined` when it did not answer.
 */
export async function readTokenInfo(client, token) {
    const address = getAddress(token);
    const [symbol, decimals] = await Promise.all([
        readContract(client, { address, abi: erc20Abi, functionName: "symbol" }).catch(() => undefined),
        readContract(client, { address, abi: erc20Abi, functionName: "decimals" }).catch(() => undefined),
    ]);
    return { token: address, symbol, decimals };
}
/**
 *  What an account holds, for the tokens you name.
 *
 *  There is no way to ask an account what tokens it has — that is an indexer's question (TRAD-265)
 *  and `eth_getLogs` cannot serve it on this chain. So this takes the list, and a caller that
 *  renders the result must say which tokens it asked about rather than implying the account holds
 *  nothing else.
 *
 *  A read that did not answer is `undefined` rather than `0n`, because rendering a funded account
 *  as empty is the one wrong answer that causes someone to send money twice.
 *
 *  **`undefined` does not say WHY, and that is a real limit rather than an oversight.** A node that
 *  is down, a token that does not implement `balanceOf`, and a call that timed out all arrive here
 *  as the same value, so a caller cannot offer "retry" for one and "this token is odd" for the
 *  other. Distinguishing them means a richer return type, which would be a breaking change to a
 *  read that is otherwise doing its job; it is recorded as `holdings-failure-detail` in
 *  `RULES.md`. Until then: treat `undefined` as "ask again later", never as zero.
 *
 *  @param client Any viem client that can read.
 *  @param account The account.
 *  @param tokens The tokens to ask about.
 *  @returns The balances.
 */
export async function readHoldings(client, account, tokens = []) {
    const address = getAddress(account);
    const native = await getBalance(client, { address }).catch(() => undefined);
    const balances = await Promise.all(tokens.map(async (token) => ({
        token: getAddress(token),
        balance: await readContract(client, {
            address: getAddress(token),
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
        }).catch(() => undefined),
    })));
    return { account: address, native, tokens: balances };
}
/** The `transfer` calldata on its own, for a caller that is assembling a batch by hand. */
export function encodeErc20Transfer(to, amount) {
    return encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [getAddress(to), amount],
    });
}
//# sourceMappingURL=transfer.js.map