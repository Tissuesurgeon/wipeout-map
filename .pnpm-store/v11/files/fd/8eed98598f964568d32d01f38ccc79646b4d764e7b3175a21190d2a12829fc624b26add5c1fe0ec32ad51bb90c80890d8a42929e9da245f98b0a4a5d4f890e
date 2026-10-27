import type { FillsPageOptions, GetUserFillsPageOptions } from "./fills.js";
import type { MarketType } from "./markets.js";
type Position = {
    timestamp: string;
    blockNumber: string;
    logIndex: number;
};
/** A canonical unsigned decimal string: no sign, no leading zero, no exponent. */
export declare const isDecimal: (value: unknown) => value is string;
/** A log index the indexer can serve: a non-negative int32. */
export declare const isLogIndex: (value: unknown) => value is number;
export declare const prepare: ({ account, options, chainId, source, }: {
    account: string;
    options: GetUserFillsPageOptions;
    chainId: number;
    source: string;
}) => {
    account: string;
    scope: import("./fills.js").FillsOptions & {
        market?: string;
        markets?: readonly string[];
        pool?: string;
    } & {
        marketType?: MarketType;
    };
    limit: number;
    binding: `0x${string}`;
};
export declare const decode: (cursor: string, binding: string) => {
    position: Position;
    generation: string | null;
};
/**
 * Split a fetched page into the rows returned and the continuation.
 *
 * A FULL page continues, not only one that proved a further row with the
 * sentinel. Hasura's per-role row limit truncates silently: under a cap equal
 * to `limit`, the sentinel never arrives, and a sentinel-only rule would report
 * a range as drained while rows remain. The cost is one empty final page when a
 * range ends exactly on a page boundary.
 */
export declare const paginate: <R extends Position>(fetched: readonly R[], limit: number, binding: string, operation: string) => {
    fills: R[];
    nextCursor: string | null;
};
/**
 * The failing read is named by its caller, so a shared helper never misreports it.
 * Account-page cursors carry a generation; range-page cursors retain v1.
 */
export declare const encode: (position: Position, binding: string, operation: string, generation?: string) => string;
export declare const validatePosition: (position: Position, operation: string) => void;
export declare const before: ({ timestamp, blockNumber, logIndex }: Position) => {
    _or: ({
        timestamp: {
            _lt: string;
            _eq?: undefined;
        };
        blockNumber?: undefined;
        logIndex?: undefined;
    } | {
        timestamp: {
            _eq: string;
            _lt?: undefined;
        };
        blockNumber: {
            _lt: string;
            _eq?: undefined;
        };
        logIndex?: undefined;
    } | {
        timestamp: {
            _eq: string;
            _lt?: undefined;
        };
        blockNumber: {
            _eq: string;
            _lt?: undefined;
        };
        logIndex: {
            _lt: number;
        };
    })[];
};
/**
 * Validate a caller-supplied market kind before it becomes an indexer predicate.
 *
 * Lives here rather than in `fills.ts` so the range page and the head marker
 * reject an unknown kind with one message; every other input that enters a fill
 * page binding is normalized here too.
 */
export declare const marketKind: (value: MarketType) => MarketType;
/**
 * Validate and normalize a block-range page request.
 *
 * The binding covers both bounds as well as the kind, so a cursor cannot be
 * carried from one range into another and silently skip the rows between them.
 * Bounds normalize to numbers for the same reason `sinceBlock` does above: a
 * bound written as `900` and as `900n` must bind to ONE cursor, and a bigint
 * does not survive JSON.
 */
export declare const prepareRange: ({ options, chainId, source, }: {
    options: FillsPageOptions;
    chainId: number;
    source: string;
}) => {
    scope: {
        marketType: MarketType;
        sinceBlock: number;
        toBlock: number;
    };
    limit: number;
    binding: `0x${string}`;
};
/**
 * The predicate continuing an ASCENDING block-position page after `position`.
 *
 * Only the block position appears: `(blockNumber, logIndex)` is already a total
 * order over the table, so bringing the timestamp in would add a column without
 * breaking a single tie. It rides alongside the range's own `blockNumber`
 * bounds, which stay in force.
 */
export declare const after: ({ blockNumber, logIndex }: Position) => {
    _or: ({
        blockNumber: {
            _gt: string;
            _eq?: undefined;
        };
        logIndex?: undefined;
    } | {
        blockNumber: {
            _eq: string;
            _gt?: undefined;
        };
        logIndex: {
            _gt: number;
        };
    })[];
};
export {};
