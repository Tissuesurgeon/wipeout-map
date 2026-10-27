// The block a chain view's next read must reach.
//
// A chain view reads again when a log tells it the account changed. The read pins the
// head the node reports, and a node can report a head older than a log it has already
// pushed. A read pinned there misses the change, and nothing else asks for another read
// until the next log or the view's timer. So each view remembers the newest block a log
// asked for, and reads again until a read reaches it.
//
// A log that names a block the node never reaches must not keep the view reading, so
// the view gives up after a few reads behind; its timer still reads later.
/** How many reads in a row may land behind the block a log asked for before the view gives up on it. */
export const MAX_CATCH_UP_READS = 5;
export class CatchUp {
    /** The newest block a log asked for that no read has reached yet. */
    #wanted = null;
    #behind = 0;
    /** A log in `blockNumber` asked for a read. `null`: the log named no block. */
    ask(blockNumber) {
        if (blockNumber === null)
            return;
        if (this.#wanted !== null && blockNumber <= this.#wanted)
            return;
        this.#wanted = blockNumber;
        this.#behind = 0;
    }
    /**
     *  A read landed, and the view now shows `blockNumber`. Returns whether to read again:
     *  `true` while the view is behind the block a log asked for, at most
     *  {@link MAX_CATCH_UP_READS} times in a row.
     */
    landed(blockNumber) {
        if (this.#wanted === null)
            return false;
        if (blockNumber >= this.#wanted || this.#behind >= MAX_CATCH_UP_READS) {
            this.#wanted = null;
            this.#behind = 0;
            return false;
        }
        this.#behind += 1;
        return true;
    }
}
