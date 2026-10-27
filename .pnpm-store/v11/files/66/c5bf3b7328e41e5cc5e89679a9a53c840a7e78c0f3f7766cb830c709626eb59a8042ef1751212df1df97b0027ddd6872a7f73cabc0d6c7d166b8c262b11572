// Account equity by scope. A shared concept: the scope spans market kinds, and
// only the perps scope is built.

import { isAddress, type Address, type PublicClient } from "viem";
import { InvalidInputError, NotSupportedError } from "./errors.js";
import * as PerpMargin from "./perp/margin.js";
import * as Raise from "./raise.js";

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
export type GetAccountEquityParams =
  | {
      /** The part of the account to value. */
      scope: "perps";
      /** The MarginBank that holds the account's perp collateral. It comes off the `PerpMarket` row. */
      marginBank: Address;
      /**
       *  Read at this block instead of the current head. The RPC must still serve
       *  state at that block.
       */
      blockNumber?: bigint;
    }
  | {
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
export type AccountEquityEntry =
  | ({
      /** The account that was valued. */
      account: Address;
      /** Every market the account holds has a fresh mark price. */
      priceable: true;
    } & AccountEquity)
  | {
      /** The account that could not be valued. */
      account: Address;
      /** A market the account holds has no fresh mark price. There is no equity, not a zero. */
      priceable: false;
      /** The scope that was requested. */
      scope: "perps";
      /** The block the attempt was pinned to. */
      asOfBlock: bigint;
    };

type PerpsParams = Extract<GetAccountEquityParams, { scope: "perps" }>;

// The `?.` and the type checks guard untyped JavaScript callers.
function perpsParams(method: string, params: GetAccountEquityParams, accounts: readonly Address[]): PerpsParams {
  if (params?.scope === "spot" || params?.scope === "overall") {
    throw new NotSupportedError(`${method} scope "${params.scope}"`);
  }
  if (params?.scope !== "perps") {
    throw new InvalidInputError('unknown account equity scope: use "perps", "spot" or "overall"');
  }
  if (
    !Array.isArray(accounts) ||
    // `Array.from` turns the holes of a sparse array into `undefined`, which `every` would skip.
    !Array.from(accounts).every((account) => isAddress(account, { strict: false })) ||
    !isAddress(params.marginBank, { strict: false })
  ) {
    throw new InvalidInputError(`${method} needs account addresses and a marginBank address`);
  }
  if (params.blockNumber !== undefined && (typeof params.blockNumber !== "bigint" || params.blockNumber < 0n)) {
    throw new InvalidInputError(`${method} blockNumber must be a non-negative bigint`);
  }
  return params;
}

// `getClient` is lazy so a params error is thrown before the client is resolved.
export async function getAccountEquity(
  account: Address,
  params: GetAccountEquityParams,
  getClient: () => PublicClient,
): Promise<AccountEquity> {
  const { marginBank, blockNumber } = perpsParams("getAccountEquity", params, [account]);
  const { equity, lockedCollateral, asOfBlock } = await PerpMargin.getMarginEquity(
    marginBank,
    account,
    getClient(),
    blockNumber,
  );
  return { scope: "perps", equity, lockedCollateral, totalEquity: equity + lockedCollateral, asOfBlock };
}

export async function listAccountEquities(
  accounts: readonly Address[],
  params: GetAccountEquityParams,
  getClient: () => PublicClient,
): Promise<AccountEquityEntry[]> {
  const { marginBank, blockNumber } = perpsParams("listAccountEquities", params, accounts);
  if (accounts.length === 0) return [];
  const rows = await PerpMargin.listMarginEquities(marginBank, accounts, getClient(), blockNumber);
  return rows.map(({ equity, lockedCollateral, asOfBlock }, i): AccountEquityEntry => {
    const account = accounts[i] ?? Raise.unreachable("equity row without its account");
    if (equity === null) return { account, priceable: false, scope: "perps", asOfBlock };
    return {
      account,
      priceable: true,
      scope: "perps",
      equity,
      lockedCollateral,
      totalEquity: equity + lockedCollateral,
      asOfBlock,
    };
  });
}
