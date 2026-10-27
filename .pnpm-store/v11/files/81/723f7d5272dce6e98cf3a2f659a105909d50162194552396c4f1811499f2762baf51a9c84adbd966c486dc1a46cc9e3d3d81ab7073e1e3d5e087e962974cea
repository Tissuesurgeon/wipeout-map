// Internal socket construction. Node's native WebSocket can redial through its
// HTTP pool after CONNECTING cancellation. A private ws transport has one dial
// and public termination; browsers retain their platform constructor.
import type { WebSocket as NodeWebSocket } from "ws";
import type { SomniaMarketsSocketFailure, SomniaMarketsWebSocketConstructor } from "./config.js";
import * as Errors from "./errors.js";
import { InvariantError } from "./raise.js";

const platformWebSocket = globalThis.WebSocket;

/** Property handlers retain their listener position when the callback changes. */
function eventHandler<K extends keyof WebSocketEventMap>(target: WebSocket, type: K) {
  type Handler = (this: WebSocket, event: WebSocketEventMap[K]) => unknown;
  let handler: Handler | null = null;
  // EventTarget erases the map; this listener is registered only for `type`.
  const listener = (event: Event): void => {
    handler?.call(target, event as WebSocketEventMap[K]);
  };
  return {
    get: () => handler,
    set(next: Handler | null): void {
      if (!handler && next) target.addEventListener(type, listener);
      if (handler && !next) target.removeEventListener(type, listener);
      handler = next;
    },
  };
}

/** One owned Node transport with the DOM events expected by viem and callers. */
class OwnedNodeWebSocket extends EventTarget implements WebSocket {
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  binaryType: BinaryType = "blob";
  private readonly handlers = {
    open: eventHandler(this, "open"),
    message: eventHandler(this, "message"),
    error: eventHandler(this, "error"),
    close: eventHandler(this, "close"),
  };

  get onopen(): WebSocket["onopen"] {
    return this.handlers.open.get();
  }
  set onopen(handler: WebSocket["onopen"]) {
    this.handlers.open.set(handler);
  }
  get onmessage(): WebSocket["onmessage"] {
    return this.handlers.message.get();
  }
  set onmessage(handler: WebSocket["onmessage"]) {
    this.handlers.message.set(handler);
  }
  get onerror(): WebSocket["onerror"] {
    return this.handlers.error.get();
  }
  set onerror(handler: WebSocket["onerror"]) {
    this.handlers.error.set(handler);
  }
  get onclose(): WebSocket["onclose"] {
    return this.handlers.close.get();
  }
  set onclose(handler: WebSocket["onclose"]) {
    this.handlers.close.set(handler);
  }

  constructor(private readonly transport: NodeWebSocket) {
    super();
    transport.binaryType = "arraybuffer";
    transport.addEventListener("open", () => this.dispatchEvent(new Event("open")));
    transport.addEventListener("error", ({ error, message }) => {
      this.dispatchEvent(Object.assign(new Event("error"), { error, message }));
    });
    transport.addEventListener("close", ({ code, reason, wasClean }) => {
      this.dispatchEvent(Object.assign(new Event("close"), { code, reason, wasClean }));
    });
    transport.addEventListener("message", (event) => {
      const data: unknown = event.data;
      if (typeof data !== "string" && !(data instanceof ArrayBuffer)) {
        const error = new TypeError("Unsupported WebSocket message data");
        this.dispatchEvent(Object.assign(new Event("error"), { error, message: error.message }));
        return;
      }
      let message: string | ArrayBuffer | Blob = data;
      if (data instanceof ArrayBuffer && this.binaryType === "blob") message = new Blob([data]);
      this.dispatchEvent(new MessageEvent("message", { data: message, origin: new URL(this.url).origin }));
    });
  }

  get bufferedAmount(): number {
    return this.transport.bufferedAmount;
  }
  get extensions(): string {
    return this.transport.extensions;
  }
  get protocol(): string {
    return this.transport.protocol;
  }
  get readyState(): WebSocket["readyState"] {
    return this.transport.readyState;
  }
  get url(): string {
    return this.transport.url;
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    this.transport.send(data);
  }

  close(): void {
    // This is owner disposal, including viem's no-argument raw close. Avoid
    // ws.close's acknowledgement timer; public termination ends the one dial.
    this.transport.terminate();
  }
}

type ConstructSocket = (url: string, protocols?: string | string[]) => WebSocket;

/** Private infrastructure forwarded from the configured root, never a capability input. */
export interface Infrastructure {
  readonly rpcWebSocketConstructor?: SomniaMarketsWebSocketConstructor;
}

/** Normalize before viem can discard a falsey cause or reinterpret an SDK class. */
export function failure(error: unknown, operation: string): SomniaMarketsSocketFailure {
  const typed = Errors.sdkFailure(error, InvariantError);
  if (typed) return typed;
  return new Errors.RpcError(operation, "owned RPC socket failed", { cause: error });
}

/** Invoke only the standard arguments, retaining the supplied instance verbatim. */
function construct(Constructor: SomniaMarketsWebSocketConstructor): ConstructSocket {
  return (url, protocols) => (protocols === undefined ? new Constructor(url) : new Constructor(url, protocols));
}

/** Select before constructing, so the owner can check cancellation after imports. */
export async function getConstructor(infrastructure: Infrastructure = {}): Promise<ConstructSocket> {
  if (infrastructure.rpcWebSocketConstructor) return construct(infrastructure.rpcWebSocketConstructor);
  if (typeof process !== "undefined" && process.versions?.node) {
    const { WebSocket: NodeConstructor } = await import("ws");
    return (url, protocols) =>
      new OwnedNodeWebSocket(protocols === undefined ? new NodeConstructor(url) : new NodeConstructor(url, protocols));
  }
  const override = globalThis.WebSocket;
  if (override && !Object.is(override, platformWebSocket)) return construct(override);
  const { WebSocket: Constructor } = await import("isows");
  return construct(Constructor);
}
