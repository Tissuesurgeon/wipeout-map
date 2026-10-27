import * as Errors from "./errors.js";
import { InvariantError } from "./raise.js";
const platformWebSocket = globalThis.WebSocket;
/** Property handlers retain their listener position when the callback changes. */
function eventHandler(target, type) {
    let handler = null;
    // EventTarget erases the map; this listener is registered only for `type`.
    const listener = (event) => {
        handler?.call(target, event);
    };
    return {
        get: () => handler,
        set(next) {
            if (!handler && next)
                target.addEventListener(type, listener);
            if (handler && !next)
                target.removeEventListener(type, listener);
            handler = next;
        },
    };
}
/** One owned Node transport with the DOM events expected by viem and callers. */
class OwnedNodeWebSocket extends EventTarget {
    transport;
    CONNECTING = 0;
    OPEN = 1;
    CLOSING = 2;
    CLOSED = 3;
    binaryType = "blob";
    handlers = {
        open: eventHandler(this, "open"),
        message: eventHandler(this, "message"),
        error: eventHandler(this, "error"),
        close: eventHandler(this, "close"),
    };
    get onopen() {
        return this.handlers.open.get();
    }
    set onopen(handler) {
        this.handlers.open.set(handler);
    }
    get onmessage() {
        return this.handlers.message.get();
    }
    set onmessage(handler) {
        this.handlers.message.set(handler);
    }
    get onerror() {
        return this.handlers.error.get();
    }
    set onerror(handler) {
        this.handlers.error.set(handler);
    }
    get onclose() {
        return this.handlers.close.get();
    }
    set onclose(handler) {
        this.handlers.close.set(handler);
    }
    constructor(transport) {
        super();
        this.transport = transport;
        transport.binaryType = "arraybuffer";
        transport.addEventListener("open", () => this.dispatchEvent(new Event("open")));
        transport.addEventListener("error", ({ error, message }) => {
            this.dispatchEvent(Object.assign(new Event("error"), { error, message }));
        });
        transport.addEventListener("close", ({ code, reason, wasClean }) => {
            this.dispatchEvent(Object.assign(new Event("close"), { code, reason, wasClean }));
        });
        transport.addEventListener("message", (event) => {
            const data = event.data;
            if (typeof data !== "string" && !(data instanceof ArrayBuffer)) {
                const error = new TypeError("Unsupported WebSocket message data");
                this.dispatchEvent(Object.assign(new Event("error"), { error, message: error.message }));
                return;
            }
            let message = data;
            if (data instanceof ArrayBuffer && this.binaryType === "blob")
                message = new Blob([data]);
            this.dispatchEvent(new MessageEvent("message", { data: message, origin: new URL(this.url).origin }));
        });
    }
    get bufferedAmount() {
        return this.transport.bufferedAmount;
    }
    get extensions() {
        return this.transport.extensions;
    }
    get protocol() {
        return this.transport.protocol;
    }
    get readyState() {
        return this.transport.readyState;
    }
    get url() {
        return this.transport.url;
    }
    send(data) {
        this.transport.send(data);
    }
    close() {
        // This is owner disposal, including viem's no-argument raw close. Avoid
        // ws.close's acknowledgement timer; public termination ends the one dial.
        this.transport.terminate();
    }
}
/** Normalize before viem can discard a falsey cause or reinterpret an SDK class. */
export function failure(error, operation) {
    const typed = Errors.sdkFailure(error, InvariantError);
    if (typed)
        return typed;
    return new Errors.RpcError(operation, "owned RPC socket failed", { cause: error });
}
/** Invoke only the standard arguments, retaining the supplied instance verbatim. */
function construct(Constructor) {
    return (url, protocols) => (protocols === undefined ? new Constructor(url) : new Constructor(url, protocols));
}
/** Select before constructing, so the owner can check cancellation after imports. */
export async function getConstructor(infrastructure = {}) {
    if (infrastructure.rpcWebSocketConstructor)
        return construct(infrastructure.rpcWebSocketConstructor);
    if (typeof process !== "undefined" && process.versions?.node) {
        const { WebSocket: NodeConstructor } = await import("ws");
        return (url, protocols) => new OwnedNodeWebSocket(protocols === undefined ? new NodeConstructor(url) : new NodeConstructor(url, protocols));
    }
    const override = globalThis.WebSocket;
    if (override && !Object.is(override, platformWebSocket))
        return construct(override);
    const { WebSocket: Constructor } = await import("isows");
    return construct(Constructor);
}
