import type { PerpAdlQueueRead } from "./adl.js";
import type { PerpAdlQueueView } from "./adlView.js";
/** How often the side is read again when no event asks for it. */
export declare const BACKSTOP_MS = 30000;
export interface AdlSessionDeps {
    readonly chainId: number;
    /** The MarginBank, lower-case, as the views name it. */
    readonly marginBank: string;
    /** The perp pool, lower-case, as the views name it. */
    readonly pool: string;
    readonly isLong: boolean;
    /** One chain read of the side. `signal` aborts when the session closes, and the read then sends no more calls. */
    readonly read: (signal: AbortSignal) => Promise<PerpAdlQueueRead>;
    /**
     *  Subscribes to the MarginBank events that can move the queue, and returns the release. `onLog`
     *  gets the log's block, `null` when it names none. `onError` fires at most once,
     *  when the subscription is lost, and `onOpen` once, when the node confirms it. None
     *  of them fires during the call. Throws `NotConfiguredError` when the client has no
     *  chain transport.
     */
    readonly watch: (onLog: (blockNumber: bigint | null) => void, onError: () => void, onOpen: () => void) => () => void;
    readonly publish: (view: PerpAdlQueueView) => void;
    readonly nextRevision: () => number;
    readonly nowMs: () => number;
    /** The delay before retry `attempt`, counting from 0. */
    readonly backoffMs: (attempt: number) => number;
    readonly warn: (message: string, data?: Record<string, unknown>) => void;
}
export declare class AdlSession {
    #private;
    /** Opens nothing: `start` publishes, subscribes and reads. */
    constructor(deps: AdlSessionDeps);
    /** The last view the session published, if any. */
    get view(): PerpAdlQueueView | undefined;
    /** Publishes `loading`, subscribes to the market's events and reads the side. */
    start(): void;
    /** Stops for good. `publishClosed` sends a last `closed` view. */
    close(publishClosed: boolean): void;
}
