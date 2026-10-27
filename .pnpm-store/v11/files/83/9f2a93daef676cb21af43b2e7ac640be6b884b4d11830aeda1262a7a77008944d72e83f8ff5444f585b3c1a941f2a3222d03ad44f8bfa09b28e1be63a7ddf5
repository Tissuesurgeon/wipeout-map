// Account equity by scope. A shared concept: the scope spans market kinds, and
// only the perps scope is built.
import { isAddress } from "viem";
import { InvalidInputError, NotSupportedError } from "./errors.js";
import * as PerpMargin from "./perp/margin.js";
import * as Raise from "./raise.js";
// The `?.` and the type checks guard untyped JavaScript callers.
function perpsParams(method, params, accounts) {
    if (params?.scope === "spot" || params?.scope === "overall") {
        throw new NotSupportedError(`${method} scope "${params.scope}"`);
    }
    if (params?.scope !== "perps") {
        throw new InvalidInputError('unknown account equity scope: use "perps", "spot" or "overall"');
    }
    if (!Array.isArray(accounts) ||
        // `Array.from` turns the holes of a sparse array into `undefined`, which `every` would skip.
        !Array.from(accounts).every((account) => isAddress(account, { strict: false })) ||
        !isAddress(params.marginBank, { strict: false })) {
        throw new InvalidInputError(`${method} needs account addresses and a marginBank address`);
    }
    if (params.blockNumber !== undefined && (typeof params.blockNumber !== "bigint" || params.blockNumber < 0n)) {
        throw new InvalidInputError(`${method} blockNumber must be a non-negative bigint`);
    }
    return params;
}
// `getClient` is lazy so a params error is thrown before the client is resolved.
export async function getAccountEquity(account, params, getClient) {
    const { marginBank, blockNumber } = perpsParams("getAccountEquity", params, [account]);
    const { equity, lockedCollateral, asOfBlock } = await PerpMargin.getMarginEquity(marginBank, account, getClient(), blockNumber);
    return { scope: "perps", equity, lockedCollateral, totalEquity: equity + lockedCollateral, asOfBlock };
}
export async function listAccountEquities(accounts, params, getClient) {
    const { marginBank, blockNumber } = perpsParams("listAccountEquities", params, accounts);
    if (accounts.length === 0)
        return [];
    const rows = await PerpMargin.listMarginEquities(marginBank, accounts, getClient(), blockNumber);
    return rows.map(({ equity, lockedCollateral, asOfBlock }, i) => {
        const account = accounts[i] ?? Raise.unreachable("equity row without its account");
        if (equity === null)
            return { account, priceable: false, scope: "perps", asOfBlock };
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
