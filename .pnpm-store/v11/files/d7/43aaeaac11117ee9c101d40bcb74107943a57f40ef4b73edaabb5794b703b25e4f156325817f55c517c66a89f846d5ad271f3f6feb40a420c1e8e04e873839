import { type Address } from "viem";
import * as PerpPortfolio from "./perp/portfolio.js";
import * as SpotPortfolio from "./spot/portfolio.js";
import * as BinaryPortfolio from "./binary/portfolio.js";
import * as Markets from "./markets.js";
import * as SyncStatus from "./syncStatus.js";
import type * as PortfolioScope from "./portfolioScope.js";
import * as Client from "./client.js";
import type { ClientConfig, SomniaMarketsSocketFailure } from "./config.js";
import type { SomniaMarketsClient, SomniaMarketsClientWithObservations } from "./somniaMarketsClient.js";
export type { SomniaMarketsClient };
/** Private owner registration, with one observer per freshness invocation. */
export type FreshnessRead = (chainId: number, observed?: (failure: SomniaMarketsSocketFailure) => void) => Promise<SyncStatus.IndexerFreshness | null>;
/** Private balance readers bound to one configured owner. */
export interface BalanceReads {
    native(address: Address, observed?: (failure: SomniaMarketsSocketFailure) => void): Promise<bigint>;
    erc20(token: Address, address: Address, observed?: (failure: SomniaMarketsSocketFailure) => void): Promise<bigint>;
}
export interface Infrastructure extends Client.RpcInfrastructure {
    registerFreshness?(read: FreshnessRead, selected: SomniaMarketsClientWithObservations["getIndexerFreshness"]): void;
    registerBalances?(read: BalanceReads, selected: Pick<SomniaMarketsClientWithObservations, "getNativeBalance" | "getErc20Balance">): void;
}
/** Await this owner's existing genesis check without issuing a protocol read. */
export declare function validateChain(client: SomniaMarketsClient): Promise<void>;
/** Refuse a pool that no longer hosts the requested immutable market clone. */
export declare function assertBinaryPoolGeneration(client: SomniaMarketsClient, pool: Address, marketAddress: Address): Promise<void>;
/** Resolve one finite batch through this owner's existing governed indexer. */
export declare function resolveMarkets(client: SomniaMarketsClient, ids: readonly string[], signal: AbortSignal): Promise<(Markets.Market | null)[]>;
/** Owner-private portfolio order reads retain the native row shapes. */
export type ScopedOpenOrders = {
    type: "BINARY";
    orders: BinaryPortfolio.PortfolioOrder[];
} | {
    type: "SPOT";
    orders: SpotPortfolio.SpotPortfolioOrder[];
} | {
    type: "PERP";
    orders: PerpPortfolio.PerpPortfolioOrder[];
};
/** Read a single tradable through its configured owner's portfolio boundary. */
export declare function readScopedOpenOrders(client: SomniaMarketsClient, owner: string, type: Markets.MarketType, scope: PortfolioScope.OrderScope, limit: number | undefined, signal: AbortSignal): Promise<ScopedOpenOrders>;
export declare function createClient(config: ClientConfig, infrastructure?: Infrastructure): SomniaMarketsClientWithObservations;
/**
 * Prepare the owner's existing socket without issuing a chain read. Missing RPC
 * configuration stays lazy, so an indexer-only load remains usable. Preparation
 * is speculative: the load observes its result, while each required read keeps
 * its own typed failure and genesis gate. Abort ends only this wait. The
 * owning connection keeps the dial under its four-second connect deadline until
 * it opens, fails or the owner closes, so the next chain read joins it.
 */
export declare function prepareChain(client: SomniaMarketsClient, signal: AbortSignal): Promise<void>;
