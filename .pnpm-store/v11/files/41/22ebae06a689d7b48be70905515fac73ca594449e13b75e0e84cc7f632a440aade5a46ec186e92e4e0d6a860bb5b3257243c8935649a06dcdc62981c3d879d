import { type Address, type PublicClient } from "viem";
/**
 * Which part of an account {@link SomniaMarketsClient.getAccountEquity} values.
 * Only `"perps"` is supported.
 *
 * @category accounts
 */
export type AccountEquityScope = "perps" | "spot" | "overall";
/**
 * Parameters for {@link SomniaMarketsClient.getAccountEquity}.
 *
 * @category accounts
 */
export type GetAccountEquityParams = {
    /** The part of the account to value. */
    scope: "perps";
    /** The MarginBank that holds the account's perp collateral. It comes off the `PerpMarket` row. */
    marginBank: Address;
    /**
     *  Read at this block instead of the current head. The RPC must still serve
     *  state at that block.
     */
    blockNumber?: bigint;
} | {
    /** A scope that is not supported yet. */
    scope: "spot" | "overall";
};
/**
 * An account's equity at one block, in raw collateral units.
 *
 * @category accounts
 */
export interface AccountEquity {
    /** The scope that was valued. */
    scope: "perps";
    /**
     *  The MarginBank's own equity: free collateral + unrealized PnL − pending
     *  funding (signed). It excludes {@link lockedCollateral}.
     */
    equity: bigint;
    /** Collateral reserved behind resting orders. */
    lockedCollateral: bigint;
    /** `equity + lockedCollateral` (signed). The figure to score an account on. */
    totalEquity: bigint;
    /** The block every read was pinned to. */
    asOfBlock: bigint;
}
/**
 * One account's result from {@link SomniaMarketsClient.listAccountEquities}.
 * Narrow on `priceable`.
 *
 * @category accounts
 */
export type AccountEquityEntry = ({
    /** The account that was valued. */
    account: Address;
    /** Every market the account holds has a fresh mark price. */
    priceable: true;
} & AccountEquity) | {
    /** The account that could not be valued. */
    account: Address;
    /** A market the account holds has no fresh mark price. There is no equity, not a zero. */
    priceable: false;
    /** The scope that was requested. */
    scope: "perps";
    /** The block the attempt was pinned to. */
    asOfBlock: bigint;
};
export declare function getAccountEquity(account: Address, params: GetAccountEquityParams, getClient: () => PublicClient): Promise<AccountEquity>;
export declare function listAccountEquities(accounts: readonly Address[], params: GetAccountEquityParams, getClient: () => PublicClient): Promise<AccountEquityEntry[]>;
