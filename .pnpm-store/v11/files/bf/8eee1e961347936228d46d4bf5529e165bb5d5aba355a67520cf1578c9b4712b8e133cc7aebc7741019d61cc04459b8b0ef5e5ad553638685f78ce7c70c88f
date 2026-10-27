import type { Address, PublicClient } from "viem";
import type { LendAccount, LendReserve } from "./types.js";
/** The resolved lend addresses every read needs (gated in createClient). */
export interface LendReadTargets {
    /** The Pool proxy. */
    pool: Address;
    /** PoolAddressesProvider (keys the UiPoolDataProvider reads). */
    poolAddressesProvider: Address;
    /** UiPoolDataProviderV3. */
    uiPoolDataProvider: Address;
}
/**
 *  Every SomniaLend reserve with config, caps, live rates, and oracle price —
 *  one UiPoolDataProvider eth_call. Chain read (current to head); see
 *  {@link LendReserve} for units.
 */
export declare function listLendReserves(targets: LendReadTargets, client: PublicClient): Promise<LendReserve[]>;
/**
 *  A whole SomniaLend account — the Pool's risk aggregate (health factor,
 *  borrowing power) joined with every non-empty per-reserve position. Three
 *  pipelined eth_calls. Chain read (current to head).
 */
export declare function getLendAccount(account: Address, targets: LendReadTargets, client: PublicClient): Promise<LendAccount>;
