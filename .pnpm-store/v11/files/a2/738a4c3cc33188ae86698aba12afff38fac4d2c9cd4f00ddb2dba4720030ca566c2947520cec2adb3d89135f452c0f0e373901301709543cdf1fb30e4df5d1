import { IndexerError } from "./errors.js";
/** The subprotocol Hasura expects. */
export declare const GRAPHQL_TRANSPORT_WS = "graphql-transport-ws";
/** How long `open` waits for `connection_ack` by default. */
export declare const ACK_TIMEOUT_MS = 10000;
/**
 *  How long an acknowledged connection may hear nothing before the client pings the
 *  server, and how long it then waits for any frame before it fails, by default.
 */
export declare const KEEP_ALIVE_MS = 10000;
/** Receives the frames of one operation. */
export interface GraphqlWsSink {
    /** One result. `errors` holds the GraphQL error messages; `data` can be `null` beside them. */
    next(data: Readonly<Record<string, unknown>> | null, errors: readonly string[]): void;
    /** The operation or the connection failed. No call follows. */
    error(error: IndexerError): void;
    /** The server completed the operation. No call follows. */
    complete(): void;
}
export interface GraphqlWsOpenOptions {
    /** How long to wait for `connection_ack`. Defaults to {@link ACK_TIMEOUT_MS}. */
    readonly ackTimeoutMs?: number;
    /**
     *  How long the connection may hear nothing before the client sends a `ping`, and how
     *  long it then waits for any frame before it fails every operation and closes the
     *  socket. Defaults to {@link KEEP_ALIVE_MS}.
     */
    readonly keepAliveMs?: number;
    /** Stops the open. The socket closes, and `open` rejects with the signal's reason. */
    readonly signal?: AbortSignal;
    /**
     *  Receives an error a sink threw. The socket's event handlers never throw, because an
     *  error thrown from a WebSocket event stops a Node process.
     */
    readonly onSinkError?: (error: unknown) => void;
}
/** The operation name a document declares, for error reports. */
export declare function operationNameOf(document: string): string;
/**
 *  One acknowledged `graphql-transport-ws` connection.
 *
 *  `open` resolves only after `connection_ack`. A server that refuses the connection, or
 *  never answers in time, makes `open` reject rather than leave a socket that accepts
 *  operations it never serves.
 */
export declare class GraphqlWsConnection {
    #private;
    private constructor();
    /**
     *  Opens a connection to `url` (`ws://` or `wss://`).
     *
     *  Rejects with an {@link IndexerError} when the socket closes or fails before
     *  `connection_ack`, or when the ack does not arrive in time. Rejects with the signal's
     *  reason when `signal` aborts first.
     */
    static open(url: string, options?: GraphqlWsOpenOptions): Promise<GraphqlWsConnection>;
    /** Why the connection cannot be used, or `undefined` while it is open. */
    get failure(): IndexerError | undefined;
    /**
     *  Starts one operation and returns the function that stops it. Stopping twice does
     *  nothing.
     *
     *  On a connection that has failed, the sink gets the failure in a microtask, so a
     *  caller never receives a frame before `subscribe` has returned.
     */
    subscribe(document: string, variables: Readonly<Record<string, unknown>>, sink: GraphqlWsSink): () => void;
    /** Closes the socket. Every operation still open gets an error. */
    close(): void;
}
