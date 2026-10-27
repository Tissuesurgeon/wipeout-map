// The SomniaLend entry — the interface `client.lend` returns, the factory that
// binds it to a markets client's chain transport, and the two published
// deployments. Lives here (not in index.ts) so the barrel stays a pure sink —
// createClient.ts and addresses.ts deep-import this module.
import { NotConfiguredError } from "../errors.js";
import * as LenderFactory from "./lender.js";
import * as Reads from "./reads.js";
/**
 * Bind the SomniaLend module to a markets client's chain transport + fee config.
 *
 * **Details**
 *
 * Reads need `pool` + `poolAddressesProvider` + `uiPoolDataProvider`; the native
 * (SOMI) lender flows additionally need `wrappedTokenGateway`.
 * {@link SOMNIA_MAINNET_LEND} and {@link SOMNIA_TESTNET_LEND} carry the two
 * published deployments.
 *
 * - `deps`: From the owning markets client: its config (the lender needs the chain + fixed fees) and its DECORATED chain client, so an Aave revert still reads as its Solidity name. Never the undecorated `getViemClient()` one.
 * - `addresses`: The SomniaLend deployment to target.
 *
 * **Gotchas**
 *
 * NOT exported: `client.lend` is the only door, built lazily from
 * `config.addresses.lend`. A public `createLend(client, addresses)` used to exist
 * and was removed — it took a whole client but used two members, and grafting
 * one chain's addresses onto another chain's socket
 * (`createLend(mainnetClient, SOMNIA_TESTNET_LEND)`) type-checked and silently
 * read nothing. Targeting a different deployment means a different client:
 * `new SomniaMarkets({ chain, wsRpcUrl, addresses: { lend } })`.
 *
 * SomniaLend's addresses are NOT in the deployments manifests (third-party
 * contracts). Methods throw a clear error when an address they need is unset.
 *
 * @internal
 */
export function createLendWithDeps(deps, addresses) {
    const { getClient } = deps;
    const requireTargets = () => {
        if (!addresses.pool || !addresses.poolAddressesProvider || !addresses.uiPoolDataProvider) {
            throw new NotConfiguredError("config.addresses.lend { pool, poolAddressesProvider, uiPoolDataProvider } (SOMNIA_MAINNET_LEND has the published mainnet deployment)", "this lend read");
        }
        return {
            pool: addresses.pool,
            poolAddressesProvider: addresses.poolAddressesProvider,
            uiPoolDataProvider: addresses.uiPoolDataProvider,
        };
    };
    return {
        // async so a missing-address config error REJECTS instead of throwing
        // synchronously — callers (and the React hooks' .then(ok, err) capture)
        // are promised an async error channel.
        listReserves: async () => Reads.listLendReserves(requireTargets(), getClient()),
        getAccount: async (account) => Reads.getLendAccount(account, requireTargets(), getClient()),
        createLender: (config) => LenderFactory.createLenderWithDeps(config, { ...deps, addresses }),
    };
}
/**
 *  The SomniaLend mainnet deployment (chain 5031), from
 *  docs.somnialend.finance/deployed-contracts — set as `config.addresses.lend`.
 *  {@link SOMNIA_TESTNET_LEND} is the testnet sibling.
 *
 * @category lending
 */
export const SOMNIA_MAINNET_LEND = {
    pool: "0xEC6758e6324c167DB39B6908036240460a2b0168",
    poolAddressesProvider: "0x1C13Fea2A9a3Ae9962f12B6afAC1AFcd8205f752",
    uiPoolDataProvider: "0x5ef828E2C7C55eea505dA3310b0831eD01189e3E",
    wrappedTokenGateway: "0xc97d0602b501B5123a0558dDFEb2A28fD6C78dB9",
};
/**
 *  The SomniaLend Somnia-testnet deployment (chain 50312) — pass to
 *  `config.addresses.lend`. Undocumented on docs.somnialend.finance; extracted from
 *  the official app's testnet mode (app.somnialend.finance) and verified
 *  on-chain (`PoolAddressesProvider.getPool()` matches, the UiPoolDataProvider
 *  aggregate decodes, the gateway resolves its wrapped native).
 *
 * @category lending
 */
export const SOMNIA_TESTNET_LEND = {
    pool: "0x7Cb9df1bc191B16BeFF9fdEC2cd1ef91Cac18176",
    poolAddressesProvider: "0xEbf503eD254014C152965C52006A34f7Ab3d28f1",
    uiPoolDataProvider: "0xfAb035cAFe664497a9476d3b11904e284Df758c6",
    wrappedTokenGateway: "0x29edCCDB3aE8CDF0ea6077cd3E682BfA6dD53f19",
};
