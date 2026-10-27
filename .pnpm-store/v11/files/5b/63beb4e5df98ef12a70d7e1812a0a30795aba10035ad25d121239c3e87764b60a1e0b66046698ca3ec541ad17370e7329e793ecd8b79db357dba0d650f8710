import type { Address, Hex } from "viem";
import * as Markets from "../markets.js";
import type { LiveSession } from "./registry.js";
import * as Rows from "./rows.js";
import type { AccountOrdersView, AccountStop } from "./types.js";
/** How often the stop registries are listed again, so a new market's registry is followed. */
export declare const REGISTRIES_REFRESH_MS = 60000;
/** The most blocks the log read after a subscription opens goes back. Somnia's nodes refuse a wider range. */
export declare const MAX_BACKFILL_BLOCKS = 1000n;
/** A stop registry the indexer's market list names. Addresses are lower-case. */
export interface StopRegistry {
    readonly address: Address;
    /** The pool its stops place into: the market id of their rows. */
    readonly pool: Address;
    readonly venue: "perp" | "spot";
}
/** The stop registries of `markets`: those of the spot and perp markets that have one, lower-cased. */
export declare function registriesOf(markets: readonly Markets.Market[]): StopRegistry[];
/** One log a subscription or a log read delivered. The address is lower-case. */
export interface RegistryLog {
    readonly address: string;
    readonly topics: readonly Hex[];
    readonly data: Hex;
    readonly blockNumber: bigint | null;
    readonly logIndex: number | null;
    readonly transactionHash: Hex | null;
}
/** One `logs` filter: the registries, and the topics position by position. */
export interface RegistryLogFilter {
    readonly address: Address[];
    readonly topics: (Hex | Hex[] | null)[];
}
export interface ChainStopsDeps {
    /** The account, lower-cased. */
    readonly account: string;
    /** Builds the indexer's session of the account. It publishes through `publish`. */
    readonly indexer: (publish: (view: AccountOrdersView) => void) => LiveSession<AccountOrdersView>;
    /** The stop registries of the spot and perp markets. Rejects with the indexer's error. */
    readonly registries: (signal: AbortSignal) => Promise<readonly StopRegistry[]>;
    /**
     *  Subscribes to the logs `filters` match, and returns the release. `onLog` gets
     *  `undefined` for a log that does not read. `onError` fires at most once, when the
     *  subscription is lost, and `onOpen` once, when the node confirms it. None of them
     *  fires during the call. Throws when the client has no chain transport.
     */
    readonly watch: (filters: readonly RegistryLogFilter[], onLog: (log: RegistryLog | undefined) => void, onError: () => void, onOpen: () => void) => () => void;
    /** The logs `filters` match from `fromBlock` to `toBlock`, both included. */
    readonly logs: (filters: readonly RegistryLogFilter[], fromBlock: bigint, toBlock: bigint, signal: AbortSignal) => Promise<readonly (RegistryLog | undefined)[]>;
    /** The chain head. */
    readonly head: (signal: AbortSignal) => Promise<bigint>;
    /** A block's time, in Unix seconds. */
    readonly blockTime: (blockNumber: bigint, signal: AbortSignal) => Promise<bigint>;
    /** Adds the venue and the limit price to stops, as the indexer's session does. Rejects only when `signal` aborts. */
    readonly enrich: (stops: readonly Rows.AccountStopTerms[], generation: string, signal: AbortSignal) => Promise<readonly AccountStop[]>;
    readonly publish: (view: AccountOrdersView) => void;
    readonly nextRevision: () => number;
    readonly nowMs: () => number;
    /** The delay before retry `attempt`, counting from 0. */
    readonly backoffMs: (attempt: number) => number;
    readonly warn: (message: string, data?: Record<string, unknown>) => void;
}
export declare class ChainStopsSession implements LiveSession<AccountOrdersView> {
    #private;
    constructor(deps: ChainStopsDeps);
    /** The last view the session published, if any. */
    get view(): AccountOrdersView | undefined;
    start(): void;
    /** Stops for good. `publishClosed` has the indexer's session send a last `closed` view. */
    close(publishClosed: boolean): void;
}
