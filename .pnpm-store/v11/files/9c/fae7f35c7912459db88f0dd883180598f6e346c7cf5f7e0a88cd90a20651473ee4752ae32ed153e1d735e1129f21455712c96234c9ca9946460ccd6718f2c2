// A fail-closed GraphQL-over-WebSocket client for the indexer's subscriptions.
//
// Hasura serves subscriptions over the `graphql-transport-ws` protocol on the same public
// endpoint as its HTTP reads. This client speaks only the client half: one socket,
// `connection_init`, then any number of operations on it, told apart by id.
//
// It never reconnects on its own. A socket that closes, errors, or sends a frame this
// client cannot read fails every open operation with an `IndexerError`, because a stream
// that stops without a word is the one failure a consumer cannot see. So does a socket
// that goes silent: one can stay open while nothing reaches it any more, after a network
// change or a sleep, and no event says so. When nothing arrives for a while the client
// pings, and when nothing answers it fails the connection. The deployed indexers send
// their own keep-alive ping every 5 s, so the client normally sends none. The caller
// decides how to recover; the account view takes a new snapshot.
//
// It sends no headers and an empty `connection_init` payload, so it always reads as the
// public role. A browser WebSocket cannot send headers anyway, and the account view's
// limits are proved for the public role only.
//
// This is the SDK's port of `indexer/scripts/graphql-ws.ts`. The price feed keeps its own
// client (`priceFeed/hasuraWs.ts`), which reconnects by itself.
//
// Protocol: https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md
import { IndexerError } from "./errors.js";
/** The subprotocol Hasura expects. */
export const GRAPHQL_TRANSPORT_WS = "graphql-transport-ws";
/** How long `open` waits for `connection_ack` by default. */
export const ACK_TIMEOUT_MS = 10_000;
/**
 *  How long an acknowledged connection may hear nothing before the client pings the
 *  server, and how long it then waits for any frame before it fails, by default.
 */
export const KEEP_ALIVE_MS = 10_000;
/** The operation name of a failure that belongs to the whole connection. */
const CONNECTION = "graphql-ws";
/** WebSocket `readyState` for an open socket (WHATWG). */
const OPEN = 1;
function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function errorMessages(payload) {
    const list = Array.isArray(payload) ? payload : [payload];
    return list.map((error) => (isRecord(error) && "message" in error ? String(error.message) : String(error)));
}
/** The operation name a document declares, for error reports. */
export function operationNameOf(document) {
    return /(?:query|subscription)\s+(\w+)/.exec(document)?.[1] ?? "anonymous";
}
/**
 *  One acknowledged `graphql-transport-ws` connection.
 *
 *  `open` resolves only after `connection_ack`. A server that refuses the connection, or
 *  never answers in time, makes `open` reject rather than leave a socket that accepts
 *  operations it never serves.
 */
export class GraphqlWsConnection {
    #socket;
    #operations = new Map();
    #onSinkError;
    #keepAliveMs;
    #nextId = 1;
    #failure;
    /** Whether a frame arrived since the last keep-alive check. */
    #heard = false;
    /** Whether the client's ping waits for an answer. */
    #pinged = false;
    #keepAliveTimer;
    constructor(socket, options) {
        this.#socket = socket;
        this.#onSinkError = options.onSinkError;
        this.#keepAliveMs = options.keepAliveMs ?? KEEP_ALIVE_MS;
    }
    /**
     *  Opens a connection to `url` (`ws://` or `wss://`).
     *
     *  Rejects with an {@link IndexerError} when the socket closes or fails before
     *  `connection_ack`, or when the ack does not arrive in time. Rejects with the signal's
     *  reason when `signal` aborts first.
     */
    static async open(url, options = {}) {
        const { signal } = options;
        const ackTimeoutMs = options.ackTimeoutMs ?? ACK_TIMEOUT_MS;
        if (signal?.aborted)
            throw signal.reason;
        // The platform WebSocket where there is one, and the `ws` package on a Node without
        // it, as the chain socket does (`client.ts`).
        const { WebSocket } = await import("isows");
        if (signal?.aborted)
            throw signal.reason;
        const socket = new WebSocket(url, GRAPHQL_TRANSPORT_WS);
        const connection = new GraphqlWsConnection(socket, options);
        return new Promise((resolve, reject) => {
            let acknowledged = false;
            const stopWaiting = () => {
                clearTimeout(timer);
                signal?.removeEventListener("abort", onAbort);
            };
            const timer = setTimeout(() => {
                stopWaiting();
                const failure = new IndexerError(CONNECTION, `no connection_ack within ${ackTimeoutMs} ms`);
                connection.#fail(failure);
                socket.close(4408, "Connection acknowledgement timeout");
                reject(failure);
            }, ackTimeoutMs);
            const onAbort = () => {
                stopWaiting();
                connection.close();
                reject(signal?.reason);
            };
            signal?.addEventListener("abort", onAbort, { once: true });
            socket.addEventListener("open", () => {
                socket.send(JSON.stringify({ type: "connection_init", payload: {} }));
            });
            socket.addEventListener("message", (event) => {
                connection.#heard = true;
                const message = connection.#parse(event.data);
                if (message === undefined)
                    return;
                // Ping and pong may arrive at any time, before the ack too: Hasura can send a
                // keep-alive ping ahead of `connection_ack`.
                if (message.type === "ping" || message.type === "pong") {
                    connection.#dispatch(message);
                    return;
                }
                if (!acknowledged) {
                    if (message.type !== "connection_ack") {
                        connection.#protocolError(`expected connection_ack, got ${String(message.type)}`);
                        return;
                    }
                    acknowledged = true;
                    stopWaiting();
                    connection.#keepAlive();
                    resolve(connection);
                    return;
                }
                connection.#dispatch(message);
            });
            socket.addEventListener("close", (event) => {
                stopWaiting();
                const detail = event.reason ? `${event.code} ${event.reason}` : String(event.code);
                connection.#fail(new IndexerError(CONNECTION, `socket closed (${detail})`));
                if (!acknowledged)
                    reject(connection.#failure ?? new IndexerError(CONNECTION, "socket closed"));
            });
            const onError = () => {
                // On an open connection an error is followed by a close event, which fails
                // every operation. Node's built-in WebSocket sends no close event after a
                // failed handshake, such as an HTTP error status or a refused subprotocol, so
                // before the ack an error fails the open at once.
                if (acknowledged)
                    return;
                // Closing a socket whose handshake failed sends another error event. This
                // listener must not hear it, or each close starts the next one.
                socket.removeEventListener("error", onError);
                stopWaiting();
                const failure = new IndexerError(CONNECTION, "the socket failed before connection_ack");
                connection.#fail(failure);
                reject(failure);
                socket.close();
            };
            socket.addEventListener("error", onError);
        });
    }
    /** Why the connection cannot be used, or `undefined` while it is open. */
    get failure() {
        return this.#failure;
    }
    /**
     *  Starts one operation and returns the function that stops it. Stopping twice does
     *  nothing.
     *
     *  On a connection that has failed, the sink gets the failure in a microtask, so a
     *  caller never receives a frame before `subscribe` has returned.
     */
    subscribe(document, variables, sink) {
        const name = operationNameOf(document);
        if (this.#failure !== undefined || this.#socket.readyState !== OPEN) {
            const failure = this.#failure ?? new IndexerError(name, "the socket is not open");
            queueMicrotask(() => this.#call(() => sink.error(failure)));
            return () => undefined;
        }
        const id = String(this.#nextId);
        this.#nextId += 1;
        this.#operations.set(id, { name, sink });
        this.#socket.send(JSON.stringify({ id, type: "subscribe", payload: { query: document, operationName: name, variables } }));
        return () => {
            if (!this.#operations.delete(id))
                return;
            if (this.#socket.readyState === OPEN)
                this.#socket.send(JSON.stringify({ id, type: "complete" }));
        };
    }
    /** Closes the socket. Every operation still open gets an error. */
    close() {
        // Close the transport before any sink hears of it, so a sink cannot keep it open.
        this.#socket.close(1000, "Normal Closure");
        this.#fail(new IndexerError(CONNECTION, "closed by the client"));
    }
    #parse(raw) {
        let message;
        try {
            message = JSON.parse(String(raw));
        }
        catch {
            this.#protocolError("unparseable frame");
            return undefined;
        }
        if (!isRecord(message) || typeof message.type !== "string") {
            this.#protocolError("frame has no type");
            return undefined;
        }
        return message;
    }
    #dispatch(message) {
        if (message.type === "ping") {
            this.#socket.send(JSON.stringify({ type: "pong" }));
            return;
        }
        if (message.type === "pong")
            return;
        if (message.type !== "next" && message.type !== "error" && message.type !== "complete") {
            this.#protocolError(`unexpected ${String(message.type)}`);
            return;
        }
        const id = typeof message.id === "string" ? message.id : undefined;
        const operation = id === undefined ? undefined : this.#operations.get(id);
        if (id === undefined || operation === undefined) {
            // A frame for an operation the client already stopped is expected. One for an id
            // this client never issued is a protocol error. Ids are "1", "2", and so on.
            if (id === undefined || !/^[1-9][0-9]*$/.test(id) || Number(id) >= this.#nextId) {
                this.#protocolError(`${message.type} for an unknown id`);
            }
            return;
        }
        if (message.type === "next") {
            // A result carries data, errors or both. Anything else is not a result, and passing
            // it on as an empty one would hide a lost update.
            const payload = message.payload;
            if (!isRecord(payload) || (!isRecord(payload.data) && payload.errors === undefined)) {
                this.#protocolError("next without a result");
                return;
            }
            const data = isRecord(payload.data) ? payload.data : null;
            const errors = payload.errors === undefined ? [] : errorMessages(payload.errors);
            this.#call(() => operation.sink.next(data, errors));
            return;
        }
        this.#operations.delete(id);
        if (message.type === "error") {
            const failure = new IndexerError(operation.name, errorMessages(message.payload).join("; "));
            this.#call(() => operation.sink.error(failure));
            return;
        }
        this.#call(() => operation.sink.complete());
    }
    /**
     *  Checks once a keep-alive period that a frame arrived. After a silent period it pings;
     *  after a second one it fails the connection, so a dead socket is found within three
     *  periods of its last frame. Any frame answers the ping.
     */
    #keepAlive() {
        this.#keepAliveTimer = setTimeout(() => {
            this.#keepAliveTimer = undefined;
            if (this.#failure !== undefined)
                return;
            if (this.#heard) {
                this.#heard = false;
                this.#pinged = false;
            }
            else if (this.#pinged || this.#socket.readyState !== OPEN) {
                // Close the transport before any sink hears of it, as `close()` does.
                this.#socket.close(4499, "Keep-alive timeout");
                this.#fail(new IndexerError(CONNECTION, `no frame from the server for ${2 * this.#keepAliveMs} ms, nor an answer to a ping`));
                return;
            }
            else {
                this.#pinged = true;
                this.#socket.send(JSON.stringify({ type: "ping" }));
            }
            this.#keepAlive();
        }, this.#keepAliveMs);
    }
    #protocolError(reason) {
        // `reason` can quote the server, and `close()` throws on a reason over 123 bytes, so
        // the close carries a fixed reason and the error carries the detail.
        this.#socket.close(4400, "Protocol error");
        this.#fail(new IndexerError(CONNECTION, `protocol error: ${reason}`));
    }
    /** Tells every open operation the connection failed. Each sink is isolated from the others. */
    #fail(failure) {
        clearTimeout(this.#keepAliveTimer);
        this.#keepAliveTimer = undefined;
        this.#failure ??= failure;
        const reason = this.#failure;
        const operations = [...this.#operations.values()];
        this.#operations.clear();
        for (const operation of operations)
            this.#call(() => operation.sink.error(reason));
    }
    #call(run) {
        try {
            run();
        }
        catch (error) {
            this.#onSinkError?.(error);
        }
    }
}
