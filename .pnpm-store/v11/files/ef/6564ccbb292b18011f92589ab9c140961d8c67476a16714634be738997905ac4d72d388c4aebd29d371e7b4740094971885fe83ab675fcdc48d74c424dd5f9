/** How many reads in a row may land behind the block a log asked for before the view gives up on it. */
export declare const MAX_CATCH_UP_READS = 5;
export declare class CatchUp {
    #private;
    /** A log in `blockNumber` asked for a read. `null`: the log named no block. */
    ask(blockNumber: bigint | null): void;
    /**
     *  A read landed, and the view now shows `blockNumber`. Returns whether to read again:
     *  `true` while the view is behind the block a log asked for, at most
     *  {@link MAX_CATCH_UP_READS} times in a row.
     */
    landed(blockNumber: bigint): boolean;
}
