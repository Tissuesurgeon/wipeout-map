import type { Address, PublicClient } from "viem";
import type { WriterRuntime } from "../writerRuntime.js";
import type { ClientConfig, SomniaMarketsSocketFailure } from "../config.js";
import type { Lender, LenderConfig } from "./lender.js";
import type { LendAccount, LendAddresses, LendReserve } from "./types.js";
/**
 * The SomniaLend client — reads over the deployed Aave-v3-fork contracts plus
 * the {@link Lender} write factory, bound to one markets client's chain
 * transport. Reached as `client.lend`.
 *
 * @category lending
 */
export interface SomniaLendClient {
    /**
     * Every SomniaLend reserve — config, caps, live rates/indexes, liquidity, and
     * the oracle price, in one aggregated eth_call. Chain read (current to head).
     *
     * **Details**
     *
     * Rates come back as ray bigints; convert for display with
     * {@link lendRayRateToApy}. See {@link LendReserve} for the unit conventions.
     *
     * **Example** (Displaying reserve APY)
     *
     * ```ts
     * const reserves = await client.lend.listReserves();
     * for (const r of reserves) {
     *   console.log(r.symbol, `supply APY ${(lendRayRateToApy(r.liquidityRateRay) * 100).toFixed(2)}%`);
     * }
     * ```
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     */
    listReserves(): Promise<LendReserve[]>;
    /**
     * A whole SomniaLend account: health factor, borrowing power, and every
     * non-empty supplied/borrowed position. Chain read (current to head).
     * @throws {InvalidInputError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {NotConfiguredError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {NotSupportedError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {SignerRequiredError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {IndexerError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {IndexerUnavailableError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {IndexerWaitTimeoutError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {RpcError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {ContractRevertError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {TransactionOutcomeUnknownError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {FillHistoryRestartRequiredError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {FillHistoryUnavailableError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {IncompleteHistoryError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {CollateralOnWrongChainError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {BridgeLiquidityError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {BridgeDeliveryTimeoutError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     * @throws {InvariantError} A supplied owner RPC constructor or socket interrupts this lending read with this SDK error. Its identity is retained.
     */
    getAccount(account: Address): Promise<LendAccount>;
    /**
     * Build a {@link Lender} bound to a signer — the write surface (supply /
     * withdraw / borrow / repay, ERC-20 and native, auto-approving). Same signer
     * doctrine as every SDK write factory (privateKey / local account / walletClient).
     */
    createLender(config: LenderConfig): Lender;
}
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
export declare function createLendWithDeps(deps: {
    getConfig: () => ClientConfig;
    getClient: () => PublicClient;
    writerRuntime?: WriterRuntime;
    getReceiptSignal?: () => AbortSignal | undefined;
}, addresses: LendAddresses): SomniaLendClient;
/**
 *  The SomniaLend mainnet deployment (chain 5031), from
 *  docs.somnialend.finance/deployed-contracts — set as `config.addresses.lend`.
 *  {@link SOMNIA_TESTNET_LEND} is the testnet sibling.
 *
 * @category lending
 */
export declare const SOMNIA_MAINNET_LEND: LendAddresses;
/**
 *  The SomniaLend Somnia-testnet deployment (chain 50312) — pass to
 *  `config.addresses.lend`. Undocumented on docs.somnialend.finance; extracted from
 *  the official app's testnet mode (app.somnialend.finance) and verified
 *  on-chain (`PoolAddressesProvider.getPool()` matches, the UiPoolDataProvider
 *  aggregate decodes, the gateway resolves its wrapped native).
 *
 * @category lending
 */
export declare const SOMNIA_TESTNET_LEND: LendAddresses;
/** Failures of this owner's lending read, including supplied RPC infrastructure. @category errors */
export type SomniaLendClientListReservesError = SomniaMarketsSocketFailure;
/** Failures of this owner's lending read, including supplied RPC infrastructure. @category errors */
export type SomniaLendClientGetAccountError = SomniaMarketsSocketFailure;
