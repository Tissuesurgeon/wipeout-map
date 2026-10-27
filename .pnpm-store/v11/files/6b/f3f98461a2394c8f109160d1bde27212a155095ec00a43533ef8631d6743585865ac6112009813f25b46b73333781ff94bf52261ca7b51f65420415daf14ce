import type { SomniaMarketsSocketFailure } from "../config.js";
import * as OwnedWebSocket from "../webSocket.js";
type NextHandler = (data: unknown) => void;
type ErrorHandler = (err: unknown) => void;
/**
 * Subscription variables, or a function returning them.
 *
 * A function is evaluated on every (re)send, which is how a streaming
 * subscription resumes from its newest cursor instead of its first one.
 */
export type SubscriptionVariables = Record<string, unknown> | (() => Record<string, unknown>);
/** A live multiplexed Hasura subscription socket for one endpoint. */
export declare class HasuraWsClient {
    private readonly url;
    private readonly onStatus?;
    private readonly infrastructure;
    private ws;
    private selecting;
    private acked;
    private closed;
    private nextId;
    private readonly subs;
    private reconnectTimer;
    private deadlineTimer;
    private reconnectDelay;
    /** A hydration owner can keep the connection alive before registering subscriptions. */
    private keepAlive;
    /**
     * Creates a subscription socket for one GraphQL endpoint.
     *
     * **Details**
     *
     * - `url`: ws:// or wss:// GraphQL endpoint.
     * - `onStatus`: Called with the live connection state (ack ⇒ true, drop ⇒ false).
     *   Deadline and retry failures also carry a semantic SDK error.
     * - Open and acknowledgement each have a 10-second deadline. Failure closes
     *   the attempt and retries after 500 ms, doubling to a maximum of 8 seconds.
     * - `infrastructure`: The owner's socket infrastructure. `close` disposes the
     *   created socket, including one that is still connecting.
     */
    constructor(url: string, onStatus?: ((connected: boolean, error?: SomniaMarketsSocketFailure) => void) | undefined, infrastructure?: OwnedWebSocket.Infrastructure);
    /**
     * Begin connecting without subscriptions. The owner must call `close` when finished.
     *
     * Resolves when the attempt has a socket, or when `close` cancels it. Rejects
     * with the typed failure when socket selection or construction fails.
     */
    connect(): Promise<void>;
    /**
     *  Register a subscription. It is (re)sent whenever the socket is live, and
     *  torn down on the returned unsubscribe.
     *
     *  Pass `variables` as a function when the subscription is a Hasura stream:
     *  it is evaluated on every send, so a reconnect resumes from the newest
     *  cursor rather than replaying from the first one.
     */
    subscribe(query: string, variables: SubscriptionVariables, onNext: NextHandler, onError?: ErrorHandler): () => void;
    /** Tear down the socket and forget every subscription. Idempotent. */
    close(): void;
    private start;
    private stop;
    private ensureSocket;
    private open;
    private onMessage;
    private onDisconnect;
    private scheduleReconnect;
    private armDeadline;
    private clearDeadline;
    private teardownSocket;
    private detach;
    private send;
}
export {};
