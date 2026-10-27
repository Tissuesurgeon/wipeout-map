// viem public client builder. Each createClient() builds one WebSocket client
// (lazily, on first chain I/O) and shares it across its tail subscriptions and
// every on-chain read/write. WebSocket is the ONLY transport — subscriptions
// (newHeads, logs) push, reads pipeline concurrently on the socket, and writes
// confirm server-side via eth_sendRawTransactionSync. Nothing polls and
// nothing falls back to HTTP: a broken socket surfaces as an ERROR (bounded by
// the request timeout below), which the live tail answers by reconnecting with
// backoff — it is never papered over by a slower transport.
//
// The SDK owns every socket it opens (SDK-OWN-004). Each connection creates its
// own WebSocket, under its own key in viem's socket cache, with viem's reconnect
// off. viem schedules a reconnect even when the FIRST connection fails, before
// it has returned a client, so nothing could close what that retry opened. The
// SDK redials a dead socket on the next request instead.
//
// No request batching is set: viem's webSocket transport has no batch option
// (only http does), and it isn't needed — the persistent socket pipelines
// concurrent requests (the `Promise.all` reads in getMarketOnchain /
// getBinaryOrderBook overlap on the wire rather than serializing).

import {
  BaseError,
  BlockNotFoundError,
  ChainDoesNotSupportContract,
  createPublicClient,
  createTransport,
  publicActions,
  hexToBigInt,
  type Address,
  type Hex,
  isAddress,
  isHex,
  type LogTopic,
  numberToHex,
  pad,
  RpcRequestError,
  SocketClosedError,
  TimeoutError,
  toEventSelector,
  WebSocketRequestError,
  type Chain,
  type PublicClient,
  type TransportConfig,
  type WebSocketTransport,
} from "viem";
import { getSocketRpcClient, type GetSocketRpcClientParameters, type SocketRpcClient } from "viem/utils";
import { NotConfiguredError, RpcError, SomniaMarketsError } from "./errors.js";
import * as Revert from "./revert.js";
import * as WebSocket from "./webSocket.js";
import type { SomniaMarketsSocketFailure } from "./config.js";

/** Private root infrastructure; not part of the public client configuration. */
export type RpcInfrastructure = WebSocket.Infrastructure;

// A cold ordinary request has one 9s bound: 4s to connect, 4s for its
// response, and at most 1s to diagnose silence. There are no transport retries.
// Heavy eth_getLogs gets 30s for its response (35s cold total), so a valid slow
// range read does not share the short deadline used by point reads.
const WS_CONNECT_TIMEOUT_MS = 4_000;
const WS_REQUEST_TIMEOUT_MS = 4_000;
const WS_PROBE_TIMEOUT_MS = 1_000;
const WS_LOGS_TIMEOUT_MS = 30_000;
// Cancellation outlives the original waiter, but cannot retain IDs indefinitely.
const WS_CANCEL_LEASE_MS = 30_000;
const WS_CANCEL_CAPACITY = 64;

/** Chain client over the WebSocket transport, so `transport.subscribe` is typed.
 *  {@link makePublicClient} builds no other transport. */
export type SocketClient = PublicClient<WebSocketTransport, Chain>;

/** viem's client for one open socket. */
type OwnedSocket = SocketRpcClient<WebSocket>;

/** viem's JSON-RPC request and response shapes, which it does not export. */
type SocketRequest = Parameters<OwnedSocket["request"]>[0];
type RpcRequest = SocketRequest["body"];
type RpcResponse = Parameters<SocketRequest["onResponse"]>[0];

/** The socket factory viem's socket client calls for each connection. */
type GetSocket = GetSocketRpcClientParameters<WebSocket>["getSocket"];

/** WebSocket `readyState` values (WHATWG), fixed by the spec. */
const WS_CONNECTING = 0;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

/** True when the socket can no longer carry a request. */
function isClosed(socket: OwnedSocket): boolean {
  const state = socket.socket.readyState;
  return state === WS_CLOSING || state === WS_CLOSED;
}

/** One chain connection: the socket it holds, and the means to end it. */
interface Connection {
  /** Recover only a semantic failure recorded at this owner's raw member boundary. */
  failure(error: unknown): SomniaMarketsSocketFailure | undefined;
  /** Original evidence at the raw subscription/escape boundary, including falsey values. */
  originalFailure(error: unknown): { readonly value: unknown } | undefined;
  /** Read this owner's raw state through its member-failure boundary. */
  isClosed(socket: OwnedSocket): boolean;
  /** The open socket, dialing a new one if there is none or it died. */
  ready(): Promise<OwnedSocket>;
  /** True once {@link Connection.close} has run. */
  readonly closed: boolean;
  /** The socket requests currently go to, if any. Never dials. */
  readonly current: OwnedSocket | undefined;
  /** Response activity on this connection, used to avoid replacing a busy socket. */
  readonly responses: number;
  /** True if this request's raw send threw before delivery. */
  didNotSend(socket: OwnedSocket, id: number): boolean;
  /** Scope private member carriers to this exact registered SDK request callback. */
  observeOwnedRequest(socket: OwnedSocket, id: number, onError: NonNullable<SocketRequest["onError"]>): () => void;
  /** Observe this exact socket even after viem removes a request callback. */
  observeResponses(socket: OwnedSocket, response: (response: RpcResponse) => void, closed: () => void): () => void;
  /** Register release only while this exact request callback remains on its socket. */
  observeRequestClose(
    socket: OwnedSocket,
    id: number,
    onError: NonNullable<SocketRequest["onError"]>,
    closed: () => void,
  ): () => void;
  /** Retire only this socket, delivering its failure to pending work. */
  retire(socket: OwnedSocket, cause: Error): void;
  /** Closes the socket, including one still in its handshake. Idempotent. */
  close(): void;
}

/**
 *  Opens chain connections for `wsRpcUrl`, one socket at a time, each owned by
 *  this connection alone.
 *
 *  **Details**
 *
 *  The socket is created here rather than by viem's `getWebSocketRpcClient`, for
 *  two reasons. First, the SDK keeps the raw WebSocket from the moment it is
 *  created, so `close()` can end a handshake that is still in progress; viem's
 *  own factory gives no handle until the socket opens. Second, the cache key is
 *  unique to this connection, so viem's process-wide cache never gives this
 *  socket to another instance or to the host app (SDK-ARCH-002).
 *
 *  Browser sockets use the platform constructor. Node sockets use a private
 *  `ws` transport so cancellation cannot reopen an idle native HTTP-pool dial.
 */
function openConnection(wsRpcUrl: string, infrastructure: RpcInfrastructure): Connection {
  const key = `somnia-markets-sdk:${globalThis.crypto.randomUUID()}`;
  let closed = false;
  let responses = 0;
  let nextDial = 0;
  let failCurrent: ((cause: Error) => void) | undefined;
  const failures = new WeakMap<object, { failure: SomniaMarketsSocketFailure; value: unknown }>();
  let disposalFailure: SomniaMarketsSocketFailure | undefined;
  const memberFailure = (error: unknown, operation: string): RpcError => {
    const registered = typeof error === "object" && error !== null ? failures.get(error) : undefined;
    const failure = registered?.failure ?? WebSocket.failure(error, operation);
    // Register a unique private carrier for this particular member failure.
    // Reusing a caller's typed error in another outcome cannot inherit origin.
    const carrier = new RpcError(operation, "owned RPC socket failed", { cause: failure });
    failures.set(carrier, { failure, value: registered ? registered.value : error });
    return carrier;
  };
  const registeredFailure = (error: unknown): { failure: SomniaMarketsSocketFailure; value: unknown } | undefined => {
    const seen = new Set<unknown>();
    let current: unknown = error;
    while (!seen.has(current)) {
      seen.add(current);
      if ((typeof current === "object" && current !== null) || typeof current === "function") {
        const registered = failures.get(current);
        if (registered) return registered;
      }
      // Only genuine viem wrappers carry the private member carrier. Unknown
      // values and hostile prototype/cause traps remain original evidence.
      try {
        if (!(current instanceof BaseError)) break;
        current = current.cause;
      } catch {
        break;
      }
    }
    return undefined;
  };
  const closedSocket = (socket: OwnedSocket): boolean => {
    try {
      return isClosed(socket);
    } catch (error) {
      throw memberFailure(error, "read RPC WebSocket state");
    }
  };
  const unsent = new WeakMap<WebSocket, RpcRequest["id"]>();
  const ownedRequests = new WeakMap<
    WebSocket,
    Map<number, { registered: () => boolean; deliver: NonNullable<Parameters<OwnedSocket["request"]>[0]["onError"]> }>
  >();
  const observers = new WeakMap<WebSocket, Set<{ response: (response: RpcResponse) => void; closed: () => void }>>();
  const requestClosures = new WeakMap<WebSocket, Set<{ registered: () => boolean; closed: () => void }>>();
  let current: OwnedSocket | undefined;
  let dialing: Promise<OwnedSocket> | undefined;
  /** The raw socket while its handshake is in progress. */
  let opening: WebSocket | undefined;

  const getSocket: GetSocket = async ({ onClose, onError, onOpen, onResponse }) => {
    if (closed) throw new SocketClosedError({ url: wsRpcUrl });
    const construct = await WebSocket.getConstructor(infrastructure).catch((error: unknown) => {
      throw memberFailure(error, "select RPC WebSocket");
    });
    if (closed) throw new SocketClosedError({ url: wsRpcUrl });
    const socket = (() => {
      try {
        return construct(wsRpcUrl);
      } catch (error) {
        throw memberFailure(error, "construct RPC WebSocket");
      }
    })();
    let cancelOpening: (() => void) | undefined;
    const cleanupMember = (cleanup: () => void): void => {
      try {
        cleanup();
      } catch (error) {
        disposalFailure ??= WebSocket.failure(error, "release RPC WebSocket listeners");
      }
    };
    const onMessage = ({ data }: MessageEvent): void => {
      if (typeof data === "string" && data.trim().length === 0) return;
      try {
        const response = JSON.parse(String(data));
        responses += 1;
        onResponse(response);
        for (const observer of observers.get(socket) ?? []) observer.response(response);
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
        // viem replays this error into every later request until a new socket
        // opens, and its reconnect is off; closing lets the next request redial.
        socket.close();
      }
    };
    let ended = false;
    const onClose_ = (): void => {
      if (ended) return;
      ended = true;
      cleanupMember(() => socket.removeEventListener("close", onClose_));
      cleanupMember(() => socket.removeEventListener("message", onMessage));
      cleanupMember(() => socket.removeEventListener("error", onError));
      cleanupMember(() => socket.removeEventListener("open", onOpen));
      try {
        // Complete only registered requests owned by this close dispatch.
        // A raw error callback, even with matching URL/class, is not close evidence.
        for (const observer of requestClosures.get(socket) ?? []) {
          if (observer.registered()) observer.closed();
        }
        onClose();
      } finally {
        for (const observer of observers.get(socket) ?? []) observer.closed();
        observers.delete(socket);
        requestClosures.delete(socket);
        unsent.delete(socket);
        ownedRequests.delete(socket);
      }
    };
    let closeSocket: (() => void) | undefined;
    // Install disposal before the handshake: a close that throws or emits no
    // event must still settle the owner's waiter and remove its logical work.
    const dispose = (): void => {
      try {
        closeSocket?.();
      } catch (error) {
        disposalFailure ??= WebSocket.failure(error, "close RPC WebSocket");
        throw disposalFailure;
      } finally {
        cancelOpening?.();
        onClose_();
      }
    };
    opening = socket;
    try {
      closeSocket = socket.close.bind(socket);
      Object.assign(socket, { close: dispose });
      // The selected constructor may reenter and close its owner before return.
      if (closed) throw new SocketClosedError({ url: wsRpcUrl });
      socket.addEventListener("close", onClose_);
      socket.addEventListener("message", onMessage);
      socket.addEventListener("error", onError);
      socket.addEventListener("open", onOpen);
      if (socket.readyState === WS_CONNECTING) {
        await new Promise<void>((resolve, reject) => {
          const cleanup = (): void => {
            clearTimeout(timer);
            cleanupMember(() => socket.removeEventListener("open", opened));
            cleanupMember(() => socket.removeEventListener("error", failed));
            cleanupMember(() => socket.removeEventListener("close", ended));
          };
          const opened = (): void => {
            cleanup();
            resolve();
          };
          const failed = (event: Event): void => {
            cleanup();
            reject(closed ? new SocketClosedError({ url: wsRpcUrl }) : event);
          };
          const ended = (): void => {
            cleanup();
            reject(new SocketClosedError({ url: wsRpcUrl }));
          };
          cancelOpening = ended;
          const timer = setTimeout(() => {
            cleanup();
            reject(new TimeoutError({ body: {}, url: wsRpcUrl }));
            try {
              socket.close();
            } catch {
              // The first timeout is already recorded. Disposal failure remains
              // observable from owner cleanup and cannot replace that outcome.
            }
          }, WS_CONNECT_TIMEOUT_MS);
          socket.addEventListener("open", opened, { once: true });
          socket.addEventListener("error", failed, { once: true });
          socket.addEventListener("close", ended, { once: true });
        });
      }
    } catch (error) {
      // Capture member defects before viem reinterprets arbitrary thrown values.
      // Platform handshake outcomes keep their existing error/cause contract.
      const failure =
        error instanceof SocketClosedError || error instanceof TimeoutError || error instanceof Event
          ? error
          : memberFailure(error, "prepare RPC WebSocket");
      try {
        dispose();
      } catch {
        // Preserve the first construction/handshake failure; cleanup reports the
        // separately recorded disposal failure when the owner is stopped.
      }
      throw failure;
    } finally {
      cancelOpening = undefined;
      opening = undefined;
    }

    failCurrent = (cause) => onError(cause);
    return Object.assign(socket, {
      ping(): void {
        try {
          if (socket.readyState === WS_CLOSED || socket.readyState === WS_CLOSING) {
            throw new WebSocketRequestError({
              url: wsRpcUrl,
              cause: new SocketClosedError({ url: wsRpcUrl }),
            });
          }
          socket.send(JSON.stringify({ jsonrpc: "2.0", id: null, method: "net_version", params: [] }));
        } catch (error) {
          // Retire only this generation before callbacks can request a replacement.
          const retiring = current?.socket === socket ? current : undefined;
          if (retiring) current = undefined;
          const waiters = [...(ownedRequests.get(socket)?.values() ?? [])]
            .filter((waiter) => waiter.registered())
            .map((waiter) => ({ waiter, failure: memberFailure(error, "ping RPC WebSocket") }));
          try {
            for (const { waiter, failure } of waiters) {
              if (!waiter.registered()) continue;
              try {
                waiter.deliver(failure);
              } catch (cleanup) {
                disposalFailure ??=
                  registeredFailure(cleanup)?.failure ?? WebSocket.failure(cleanup, "release failed ping request");
              }
            }
            // viem's raw callback admits only Error/Event in its declaration.
            // JavaScript members may throw other values; raw evidence stays exact.
            Reflect.apply(onError, undefined, [error]);
          } finally {
            try {
              retiring?.close();
            } catch (cleanup) {
              // First pending outcomes have settled; owner close exposes cleanup.
              disposalFailure ??=
                registeredFailure(cleanup)?.failure ?? WebSocket.failure(cleanup, "retire failed RPC ping");
            }
          }
        }
      },
      request({ body }: { body: RpcRequest }): void {
        unsent.delete(socket);
        try {
          if (socket.readyState === WS_CLOSED || socket.readyState === WS_CLOSING) {
            throw new WebSocketRequestError({
              body,
              url: wsRpcUrl,
              cause: new SocketClosedError({ url: wsRpcUrl }),
            });
          }
          socket.send(JSON.stringify(body));
        } catch (error) {
          unsent.set(socket, body.id);
          const registered =
            body.id === undefined || body.id === null ? undefined : ownedRequests.get(socket)?.get(body.id);
          if (!registered?.registered() || error instanceof WebSocketRequestError) throw error;
          throw memberFailure(error, "send RPC WebSocket");
        }
      },
    });
  };

  return {
    isClosed: closedSocket,
    failure(error) {
      return registeredFailure(error)?.failure;
    },
    originalFailure(error) {
      const registered = registeredFailure(error);
      if (registered) return { value: registered.value };
      return undefined;
    },
    get current() {
      return current;
    },
    get closed() {
      return closed;
    },
    get responses() {
      return responses;
    },
    didNotSend(socket, id) {
      return unsent.get(socket.socket) === id;
    },
    observeOwnedRequest(socket, id, onError) {
      const raw = socket.socket;
      let requests = ownedRequests.get(raw);
      if (!requests) {
        requests = new Map();
        ownedRequests.set(raw, requests);
      }
      const registered = () => socket.requests.get(id)?.onError === onError;
      const waiter = { registered, deliver: onError };
      requests.set(id, waiter);
      return () => {
        if (requests.get(id) === waiter) requests.delete(id);
        if (requests.size === 0) ownedRequests.delete(raw);
      };
    },
    observeResponses(socket, response, closed) {
      const raw = socket.socket;
      let listeners = observers.get(raw);
      if (!listeners) {
        listeners = new Set();
        observers.set(raw, listeners);
      }
      const observer = { response, closed };
      listeners.add(observer);
      return () => listeners.delete(observer);
    },
    observeRequestClose(socket, id, onError, closed) {
      const raw = socket.socket;
      let listeners = requestClosures.get(raw);
      if (!listeners) {
        listeners = new Set();
        requestClosures.set(raw, listeners);
      }
      const observer = { registered: () => socket.requests.get(id)?.onError === onError, closed };
      listeners.add(observer);
      return () => {
        listeners.delete(observer);
        if (listeners.size === 0) requestClosures.delete(raw);
      };
    },
    retire(socket, cause): void {
      if (current !== socket) return;
      current = undefined;
      try {
        failCurrent?.(cause);
      } finally {
        // Failure delivery must never orphan the diagnosed socket.
        socket.close();
      }
    },
    ready(): Promise<OwnedSocket> {
      if (closed) return Promise.reject(new SocketClosedError({ url: wsRpcUrl }));
      if (current && !closedSocket(current)) return Promise.resolve(current);
      if (current) {
        // viem keeps a dead client cached under our key; close it so the next
        // dial creates a new socket rather than getting the dead one back.
        const dead = current;
        current = undefined;
        dead.close();
      }
      // A fresh key per dial also prevents a failure callback that redials
      // immediately from retrieving the socket currently being retired.
      dialing ??= getSocketRpcClient({ getSocket, key: `${key}:${nextDial++}`, reconnect: false, url: wsRpcUrl }).then(
        (socket) => {
          dialing = undefined;
          if (closed) {
            socket.close();
            throw new SocketClosedError({ url: wsRpcUrl });
          }
          current = socket;
          return socket;
        },
        (error: unknown) => {
          dialing = undefined;
          throw error;
        },
      );
      return dialing;
    },
    close(): void {
      if (closed) {
        if (disposalFailure) throw disposalFailure;
        return;
      }
      closed = true;
      // Ends a handshake in progress; the pending dial then rejects.
      const socket = current;
      current = undefined;
      try {
        opening?.close();
      } finally {
        socket?.close();
      }
      if (disposalFailure) throw disposalFailure;
    },
  };
}

/**
 * Start the owner's shared socket dial and wait for it until `signal` aborts.
 * Abort ends only this wait. The dial stays owned by the connection, bounded by
 * its connect deadline and owner close, so a later request joins it. Its failure
 * is observed here and reaches a later joiner through that request's own path.
 */
export async function prepareSocket(client: PublicClient, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  const work = client.transport.getRpcClient();
  work.catch(() => {});
  let stop = (): void => {};
  try {
    await new Promise<void>((resolve, reject) => {
      stop = () => reject(signal.reason);
      signal.addEventListener("abort", stop, { once: true });
      work.then(() => resolve(), reject);
    });
  } finally {
    signal.removeEventListener("abort", stop);
  }
}

/** An `eth_subscription` notification as viem's watchers read it: `result` or `error`. */
function notice(response: RpcResponse, params: { result?: unknown; error?: unknown }): RpcResponse {
  if (params.error !== undefined) return { jsonrpc: response.jsonrpc, id: response.id, error: params.error };
  return { jsonrpc: response.jsonrpc, id: response.id, result: params.result };
}

/**
 *  A viem WebSocket transport over one {@link Connection}.
 *
 *  Requests and subscriptions use the connection's socket directly and never
 *  look in viem's socket cache, so nothing here can dial a socket the
 *  connection does not own. After the connection closes, every call rejects
 *  with viem's `SocketClosedError`.
 */
interface OwnedDispatch {
  readonly transport: WebSocketTransport;
  requestView(observed?: (failure: SomniaMarketsSocketFailure) => void): SocketClient["request"];
}

function ownedWebSocket(wsRpcUrl: string, connection: Connection): OwnedDispatch {
  // A close() during the await would otherwise hand back a socket it just closed.
  const ready = async (): Promise<OwnedSocket> => {
    const socket = await connection.ready();
    if (connection.closed) throw new SocketClosedError({ url: wsRpcUrl });
    return socket;
  };
  const rawReady = async (): Promise<OwnedSocket> => {
    try {
      return await ready();
    } catch (error) {
      const registered = connection.originalFailure(error);
      throw registered ? registered.value : error;
    }
  };
  // Negative IDs are local to this transport. viem allocates positive IDs for
  // requests made directly through the raw socket accessor.
  let nextId = -1;
  const probes = new WeakMap<OwnedSocket, Promise<void>>();

  const diagnose = (socket: OwnedSocket): Promise<void> => {
    const existing = probes.get(socket);
    if (existing) return existing;
    const activity = connection.responses;
    const probe = request(socket, { method: "eth_blockNumber" }, WS_PROBE_TIMEOUT_MS)
      .then(
        () => undefined, // A JSON-RPC error response also proves that the socket answers.
        (error: unknown) => {
          if (error instanceof TimeoutError && connection.responses === activity) {
            connection.retire(socket, error);
          }
          // This diagnostic is subordinate to the original request. That request
          // still rejects with its own timeout; probe failure never becomes success.
        },
      )
      .finally(() => probes.delete(socket));
    probes.set(socket, probe);
    return probe;
  };

  const cancellations = new WeakMap<OwnedSocket, Map<number, () => void>>();
  const retireCancellation = (socket: OwnedSocket, cause: Error): void => {
    try {
      connection.retire(socket, cause);
    } catch {
      // Retirement delivers the cleanup error and closes the socket in finally.
      // A consumer failure callback cannot create an unhandled cleanup rejection.
    }
  };
  const cancelSubscription = (socket: OwnedSocket, id: number, body: RpcRequest): void => {
    if (connection.closed || connection.isClosed(socket)) return;
    let retained = cancellations.get(socket);
    if (!retained) {
      retained = new Map();
      cancellations.set(socket, retained);
    }
    if (retained.size >= WS_CANCEL_CAPACITY) {
      retireCancellation(socket, new TimeoutError({ body, url: wsRpcUrl }));
      return;
    }
    let releasing = false;
    const finish = (): void => {
      clearTimeout(lease);
      unobserve();
      retained.delete(id);
    };
    const unobserve = connection.observeResponses(
      socket,
      (response) => {
        if (response.id !== id || releasing) return;
        clearTimeout(lease);
        if (response.error) {
          finish(); // A refusal creates no server subscription to release.
          return;
        }
        if (typeof response.result !== "string") {
          finish();
          retireCancellation(
            socket,
            new RpcRequestError({
              body,
              error: { code: -32603, message: "Late eth_subscribe returned no subscription id" },
              url: wsRpcUrl,
            }),
          );
          return;
        }
        releasing = true;
        socket.subscriptions.delete(response.result);
        const cleanupBody = { method: "eth_unsubscribe", params: [response.result] };
        void request(socket, cleanupBody, WS_REQUEST_TIMEOUT_MS).then(
          (released) => {
            finish();
            if (released.result === true) return;
            retireCancellation(
              socket,
              new RpcRequestError({
                body: cleanupBody,
                error: released.error ?? { code: -32603, message: "Late subscription cleanup was not acknowledged" },
                url: wsRpcUrl,
              }),
            );
          },
          (error: unknown) => {
            finish();
            if (connection.closed || error instanceof SocketClosedError) return;
            const cause =
              error instanceof Error
                ? error
                : new WebSocketRequestError({
                    body: cleanupBody,
                    url: wsRpcUrl,
                    cause: new Error("Late subscription cleanup failed", { cause: error }),
                  });
            retireCancellation(socket, cause);
          },
        );
      },
      finish,
    );
    const lease = setTimeout(() => {
      finish();
      retireCancellation(socket, new TimeoutError({ body, url: wsRpcUrl }));
    }, WS_CANCEL_LEASE_MS);
    retained.set(id, finish);
  };

  // Own timers and callback entries instead of viem's requestAsync timeout,
  // which leaves timed-out entries behind and cannot bound subscriptions.
  const request = (
    socket: OwnedSocket,
    body: RpcRequest,
    timeout: number,
    options: {
      diagnose?: boolean;
      releaseOnClose?: boolean;
      onData?: (response: RpcResponse) => void;
      onError?: (error: unknown) => void;
    } = {},
  ): Promise<RpcResponse> =>
    new Promise((resolve, reject) => {
      const id = nextId--;
      let pending = true;
      let active = true;
      let expired: TimeoutError | undefined;
      let sending = true;
      let returned = false;
      let reportedSendFailure = false;
      let unobserveClose: (() => void) | undefined;
      let unobserveOwned: (() => void) | undefined;
      const cleanup = (): void => {
        clearTimeout(timer);
        unobserveClose?.();
        unobserveOwned?.();
        socket.requests.delete(id);
        pending = false;
      };
      const fail = (error: unknown, callbackError: unknown = error, cancelSentSubscription = false): void => {
        if (!active) return;
        active = false;
        cleanup();
        reject(error);
        // Register cancellation before calling consumer code. Capacity retirement
        // must not replace this failure's cause or deliver its callback twice.
        if (cancelSentSubscription) cancelSubscription(socket, id, body);
        try {
          options.onError?.(callbackError);
        } catch {
          // Consumer callback exceptions are isolated after the operation has
          // settled. They cannot interrupt viem's remaining failure deliveries
          // or prevent the owner's socket and timer cleanup (SDK-OWN-004).
        }
      };
      const timer = setTimeout(() => {
        expired = new TimeoutError({ body, url: wsRpcUrl });
        if (body.method === "eth_subscribe") cancelSubscription(socket, id, body);
        if (!active) return; // Cancellation capacity can retire the socket immediately.
        if (!options.diagnose) {
          fail(expired);
          return;
        }
        void diagnose(socket).then(
          () => {
            if (pending) fail(expired);
          },
          (error: unknown) => {
            // A diagnostic failure cannot strand the original waiter or replace
            // its timeout evidence. Owner closure keeps its distinct cause.
            if (pending) fail(connection.closed ? error : expired);
          },
        );
      }, timeout);
      const onError = (error: unknown): void => {
        if (sending) reportedSendFailure = true;
        // A diagnostic replacement keeps the timed-out operation's own evidence.
        // Owner cancellation remains a closure error, including during a probe.
        const cause = connection.closed ? error : (expired ?? error);
        const cancelSentSubscription =
          !sending && pending && !expired && body.method === "eth_subscribe" && !connection.didNotSend(socket, id);
        fail(cause, cause, cancelSentSubscription);
      };
      unobserveOwned = connection.observeOwnedRequest(socket, id, onError);
      if (options.releaseOnClose) {
        unobserveClose = connection.observeRequestClose(socket, id, onError, () => {
          if (!active || !pending) return;
          if (expired) {
            fail(expired);
            return;
          }
          active = false;
          cleanup();
          resolve({ jsonrpc: "2.0", id, result: true });
        });
      }
      try {
        socket.request({
          body: { ...body, id },
          onError,
          onResponse(response) {
            if (!active || expired) {
              // viem registers subscription IDs before delivering the acknowledgement.
              // Undo that registration when an acknowledgement misses its deadline.
              if (body.method === "eth_subscribe" && typeof response.result === "string") {
                socket.subscriptions.delete(response.result);
              }
              return;
            }
            if (response.method === "eth_subscription") {
              options.onData?.(response);
              return;
            }
            if (!pending) return;
            if (body.method === "eth_subscribe" && response.error) {
              fail(new RpcRequestError({ body, error: response.error, url: wsRpcUrl }), response.error);
              return;
            }
            cleanup();
            resolve(response);
          },
        });
        returned = true;
      } catch (error) {
        fail(connection.closed ? error : (expired ?? error));
      } finally {
        sending = false;
        // viem may report a cached error and still send. Track that failed
        // subscription unless the raw boundary proves this send never happened.
        if (returned && reportedSendFailure && body.method === "eth_subscribe" && !connection.didNotSend(socket, id)) {
          cancelSubscription(socket, id, body);
        }
        // viem can report a cached failure before registering the request callback.
        // Remove entries added after that synchronous failure has already settled.
        if (!pending) socket.requests.delete(id);
      }
    });

  const config = (
    modeled: boolean,
    observed?: (failure: SomniaMarketsSocketFailure) => void,
  ): TransportConfig<"webSocket"> => ({
    key: "webSocket",
    name: "WebSocket JSON-RPC",
    type: "webSocket",
    retryCount: 0,
    timeout: WS_REQUEST_TIMEOUT_MS,
    async request({ method, params }) {
      const body = { method, params };
      try {
        const socket = await ready();
        const timeout = method === "eth_getLogs" ? WS_LOGS_TIMEOUT_MS : WS_REQUEST_TIMEOUT_MS;
        const { error, result } = await request(socket, body, timeout, { diagnose: true });
        if (error) throw new RpcRequestError({ body, error, url: wsRpcUrl });
        return result;
      } catch (error) {
        if (modeled) {
          const failure = connection.failure(error);
          if (failure) observed?.(failure);
          throw error;
        }
        const original = connection.originalFailure(error);
        throw original ? original.value : error;
      }
    },
  });
  const transport: WebSocketTransport = () =>
    createTransport(config(false), {
      getSocket: async () => (await rawReady()).socket,
      getRpcClient: rawReady,
      async subscribe({ params, onData, onError }) {
        // One await, as raw requests take, so subscribe sends in call order.
        let socket: OwnedSocket;
        try {
          socket = await ready();
        } catch (error) {
          const registered = connection.originalFailure(error);
          throw registered ? registered.value : error;
        }
        const body = { method: "eth_subscribe", params };
        const response = await request(socket, body, WS_REQUEST_TIMEOUT_MS, {
          diagnose: true,
          onData: (response) => {
            if (response.method === "eth_subscription") onData(notice(response, response.params));
          },
          onError: (error) => {
            const registered = connection.originalFailure(error);
            onError?.(registered ? registered.value : error);
          },
        }).catch((error: unknown) => {
          const registered = connection.originalFailure(error);
          throw registered ? registered.value : error;
        });
        if (!isHex(response.result)) {
          if (typeof response.result === "string") socket.subscriptions.delete(response.result);
          throw new RpcRequestError({
            body,
            error: { code: -32603, message: "eth_subscribe returned no subscription id" },
            url: wsRpcUrl,
          });
        }
        const subscriptionId = response.result;
        return {
          subscriptionId,
          unsubscribe: async (): Promise<RpcResponse> => {
            try {
              if (connection.closed || connection.isClosed(socket))
                return { jsonrpc: "2.0", id: nextId--, result: true };
              return await request(
                socket,
                { method: "eth_unsubscribe", params: [subscriptionId] },
                WS_REQUEST_TIMEOUT_MS,
                {
                  diagnose: true,
                  releaseOnClose: true,
                },
              );
            } catch (error) {
              const registered = connection.originalFailure(error);
              throw registered ? registered.value : error;
            } finally {
              socket.subscriptions.delete(subscriptionId);
            }
          },
        };
      },
    });
  return {
    transport,
    requestView: (observed) => createTransport(config(true, observed)).request,
  };
}

/**
 *  The two views of one chain connection: `decorated` for the SDK's own reads,
 *  `raw` for a caller who wants viem's semantics.
 *
 *  **Details**
 *
 *  Both ride ONE WebSocket. `decorated` is a spread copy of `raw` with the chain
 *  read methods wrapped, so it shares `raw`'s `transport` and `uid` and issues
 *  requests down the same socket. Handing out `raw` therefore costs no extra
 *  connection.
 *
 *  **Gotchas**
 *
 *  Which one a caller holds decides what a reverting read throws: `decorated`
 *  gives a typed {@link ContractRevertError}, `raw` gives viem's own error
 *  untouched. Every read INSIDE the SDK must go through `decorated` — see
 *  `createClient`'s `getClient()`, which is the only internal door.
 */
export interface OwnedViews {
  readonly client: SocketClient;
  observeFailure(observed: (failure: SomniaMarketsSocketFailure) => void): PublicClient;
}

export interface ChainClients {
  /** Undecorated viem client — viem's error contract, verbatim. */
  readonly raw: SocketClient;
  /** The SDK's client: chain reads rethrow as typed SDK errors. */
  readonly decorated: PublicClient;
  /** Private fully modeled action view; actual owned pairs always supply it. */
  readonly owned?: SocketClient;
  /** A private per-read view that reports only this view's owned member failures. */
  observeFailure?(observed: (failure: SomniaMarketsSocketFailure) => void): PublicClient;
  /** Resolve private views only for the factory's exact selected objects. */
  resolveOwnedViews?(selectedRaw: SocketClient, selectedDecorated: PublicClient): OwnedViews | undefined;
  /**
   *  Close this connection's socket.
   *
   *  Idempotent. After it, this pair's requests reject with viem's
   *  `SocketClosedError`. A socket still in its handshake is closed too. No
   *  other instance and no socket of the host app is affected: each pair owns
   *  its socket alone. See {@link makePublicClient}.
   */
  close(): void;
  /** The socket requests currently go to, as an opaque mark for {@link ChainClients.redial}. Never dials. */
  markSocket?(): ChainSocketMark | undefined;
  /**
   *  Retire the socket marked silent, if it is still current, so the next
   *  request dials a new one. A socket that was already replaced is left alone.
   */
  redial?(silentOn: ChainSocketMark | undefined): void;
}

/** Opaque identity of one chain socket. See {@link ChainClients.markSocket}. */
export type ChainSocketMark = object;

/**
 *  Build the WebSocket chain connection for a chain + RPC, in both views.
 *
 *  **Details**
 *
 *  Modeled chain read methods are wrapped on the `decorated` view so a failing
 *  read reaches callers as one of OUR typed errors — a decoded
 *  {@link ContractRevertError} when the contract rejected the call, an
 *  {@link RpcError} when the request never got an answer. This is the read-side
 *  counterpart of the write path's funnel in trade.ts, and doing it at the ONE
 *  place the client is constructed covers every chain read in the SDK (the
 *  concept modules' point reads, oracleHub.ts, system.ts, operatorReads.ts —
 *  ~83 call sites) without a wrap at each one.
 *
 *  Owned RPC operations do not retry automatically. An ordinary request takes
 *  at most 9 seconds including a cold connection: 4 seconds for the handshake,
 *  4 seconds for the response, and 1 second for a liveness probe on timeout.
 *  Subscription acknowledgements and unsubscriptions use the same deadlines.
 *  A failed subscription that may have been sent gets a separate 30-second lease to
 *  observe a late server ID, then up to 4 seconds to unsubscribe that ID. This also
 *  applies when a socket error arrives after sending but before acknowledgement.
 *  Each socket retains at most 64 cancellations, including cleanup in flight.
 *  Lease expiry, capacity exhaustion or failed cleanup retires that socket and
 *  delivers the cleanup error to its other pending operations/subscriptions.
 *  These cleanup bounds do not extend the original timeout or repeat its callback.
 *  Unsubscribe completes locally with a `result: true` response if the socket
 *  is already closed or closure cancels its pending release. Transport
 *  failures, including timeouts, still reject; live sockets return the wire response.
 *  `eth_getLogs` has a 30-second response deadline (35 seconds cold total).
 *  A timeout replaces the socket only when the probe also times out and no
 *  response arrives during the probe. Closing the owner cancels pending work.
 *  Exceptions from subscription failure callbacks and private observers are isolated after failure
 *  delivery, so they cannot interrupt other requests or owner cleanup.
 *
 *  Returns {@link ChainClients} rather than one client because the SDK owes
 *  callers an undecorated escape hatch (`client.getViemClient()`) that does not
 *  open a second socket. `raw` is that client; it is NOT for internal use.
 *
 *  **Gotchas**
 *
 *  Only the error's TYPE changes here, never the control flow. Chain reads keep
 *  throwing rather than returning `null` — see CONVENTIONS.md "Return + error
 *  contract". Modules that deliberately swallow a read (the `getErc20Decimals`
 *  fallback, for one) still catch and still fall back: a typed error is caught
 *  by the same `catch`.
 *
 *  The returned {@link ChainClients} owns a socket, so its {@link
 *  ChainClients.close} must run on dispose. A `raw` or `decorated` client kept
 *  past that call is stale: new RPC requests reject with viem's
 *  `SocketClosedError`, and it never opens a socket again. Ask the owner for
 *  the pair again instead of holding one across a dispose.
 */
export function makePublicClient(chain: Chain, wsRpcUrl: string, infrastructure: RpcInfrastructure = {}): ChainClients {
  const connection = openConnection(wsRpcUrl, infrastructure);
  const dispatch = ownedWebSocket(wsRpcUrl, connection);
  const raw = createPublicClient({ chain, transport: dispatch.transport });
  const recover = (error: unknown): SomniaMarketsSocketFailure | undefined => connection.failure(error);
  /** Bind each observer to an action view while sharing the owner's socket. */
  const makeOwnedView = (observed?: (failure: SomniaMarketsSocketFailure) => void): SocketClient => {
    const reported = new WeakSet<SomniaMarketsSocketFailure>();
    /** Notify this view once when transport and action boundaries see the same failure. */
    const report = (failure: SomniaMarketsSocketFailure): void => {
      if (reported.has(failure)) return;
      reported.add(failure);
      try {
        observed?.(failure);
      } catch {
        // Private observation cannot replace the owned failure or interrupt joined reads.
      }
    };
    // publicActions binds pure action closures. This copy creates no engine,
    // transport acquisition, socket, retry, cache namespace or owner lifecycle.
    // Bind against core fields only: existing raw actions would make viem's
    // getAction select raw closures and bypass this view's explicit request.
    const bound = {
      account: raw.account,
      batch: raw.batch,
      cacheTime: raw.cacheTime,
      ccipRead: raw.ccipRead,
      chain: raw.chain,
      dataSuffix: raw.dataSuffix,
      key: raw.key,
      name: raw.name,
      pollingInterval: raw.pollingInterval,
      request: dispatch.requestView(report),
      tokens: raw.tokens,
      transport: raw.transport,
      type: raw.type,
      uid: raw.uid,
      experimental_blockTag: raw.experimental_blockTag,
      extend: raw.extend,
    };
    const actions = { ...bound, ...publicActions(bound) };
    return withOwnedReadErrors(actions, recover, report);
  };
  const owned = makeOwnedView();
  // Keep the established five-method compatibility view and raw action identities.
  const decorated = withTypedReadErrors({
    ...raw,
    readContract: owned.readContract,
    call: owned.call,
    multicall: owned.multicall,
    getBlockNumber: owned.getBlockNumber,
    getBalance: owned.getBalance,
  });
  return {
    raw,
    decorated,
    owned,
    observeFailure: makeOwnedView,
    resolveOwnedViews: (selectedRaw, selectedDecorated) =>
      selectedRaw === raw && selectedDecorated === decorated
        ? { client: owned, observeFailure: makeOwnedView }
        : undefined,
    close: () => connection.close(),
    markSocket: () => connection.current,
    redial: (silentOn) => {
      const socket = connection.current;
      if (socket && socket === silentOn) connection.retire(socket, new SocketClosedError({ url: wsRpcUrl }));
    },
  };
}

/** Internal action view over the owner's modeled request dispatch only. */
function withOwnedReadErrors(
  client: SocketClient,
  recover: (error: unknown) => SomniaMarketsSocketFailure | undefined,
  observed?: (failure: SomniaMarketsSocketFailure) => void,
): SocketClient {
  const actions: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(client)) {
    if (typeof value !== "function" || key === "extend" || key.startsWith("watch")) continue;
    actions[key] = async (...args: unknown[]) => {
      try {
        return await Reflect.apply(value, client, args);
      } catch (error) {
        const failure = recover(error);
        // Viem can join an action's in-flight promise by owner uid without
        // invoking this view's request. Report its receipt at the action boundary.
        if (failure) observed?.(failure);
        throw failure ?? error;
      }
    };
  }
  const decorated = withTypedReadErrors({ ...client, ...actions }, recover);
  return {
    ...client,
    ...actions,
    readContract: decorated.readContract,
    call: decorated.call,
    multicall: decorated.multicall,
    getBlockNumber: decorated.getBlockNumber,
    getBalance: decorated.getBalance,
  };
}

/**
 *  Decorates a public client so modeled chain reads reject with SDK errors.
 *
 *  **When to use**
 *
 *  Use to give a caller-supplied `config.publicClient` the same typed-error
 *  treatment {@link makePublicClient} builds in. Kept separate for exactly that
 *  case.
 *
 *  **Details**
 *
 *  FIVE methods are normalized: `readContract`, `call` and `multicall`, which
 *  execute contract calls, and `getBlockNumber` and `getBalance`, which do not.
 *  `getBalance` is the native balance read that pre-send checks depend on. The block pin is
 *  in the list because same-block reads such as `getMarginAccount`,
 *  `getAccountHealth`, `getPerpState`, and `getPerpFeedStatus` open with it and
 *  quote its result on every call below. A failure there fails the whole read.
 *  Leaving it out meant one leg of such a read threw a raw viem error while the
 *  rest threw typed ones.
 *
 *  Everything else on the client is untouched, so this stays a thin boundary
 *  rather than a re-implementation. A method not in that list still rejects with
 *  whatever viem throws.
 *
 *  Returns a NEW client and never mutates the argument. That matters because
 *  `createTrader({ publicClient })` passes an object the CALLER owns and may use
 *  elsewhere (a shared app-wide viem client, say) — decorating it in place would
 *  reach outside this SDK and change how that caller's own reads throw. A viem
 *  client is a plain `Object.prototype` object of data properties, so the spread
 *  copy is faithful; there are no accessors or symbol keys to lose.
 *
 *  **Gotchas**
 *
 *  Because it returns a new client, the return value is the decorated one — a
 *  caller that ignores it and keeps using the argument gets raw viem errors.
 *  Applying this twice is harmless: {@link Revert.toSdkError} returns an
 *  already-SDK error untouched, so a re-decorated client does not nest errors.
 */
export function withTypedReadErrors(
  client: PublicClient,
  ownedFailure?: (error: unknown) => SomniaMarketsSocketFailure | undefined,
  observed?: (failure: SomniaMarketsSocketFailure) => void,
): PublicClient {
  const recover = (error: unknown): SomniaMarketsSocketFailure | undefined => {
    const failure = ownedFailure?.(error);
    if (failure) observed?.(failure);
    return failure;
  };
  // Wrap only the methods this client actually has. A caller can pass any
  // viem-compatible client — and the SDK's own tests pass deliberately minimal
  // stubs — so assuming a full PublicClient here would turn a partial client
  // from "works for the reads it supports" into a TypeError at construction.
  const decorated: Record<string, unknown> = {};

  if (typeof client.readContract === "function") {
    const readContract = client.readContract.bind(client);
    decorated.readContract = async (args: Parameters<typeof readContract>[0]) => {
      try {
        return await readContract(args);
      } catch (e) {
        const failure = recover(e);
        if (failure) throw failure;
        const { address, functionName } = args as { address?: string; functionName?: string };
        throw Revert.toSdkError(e, `readContract ${functionName ?? "?"}`, { address, functionName });
      }
    };
  }

  if (typeof client.call === "function") {
    const call = client.call.bind(client);
    decorated.call = async (args: Parameters<typeof call>[0]) => {
      try {
        return await call(args);
      } catch (e) {
        const failure = recover(e);
        if (failure) throw failure;
        throw Revert.toSdkError(e, "eth_call", { address: (args as { to?: string }).to });
      }
    };
  }

  // `multicall` needs its own wrapper rather than inheriting the one above. Viem binds
  // client.multicall to the RAW client when the client is created, so the aggregate3 it
  // issues internally resolves the raw readContract — the decorated one here is never
  // consulted. Without this, a revert read through multicall escapes as a bare viem
  // error while the identical read through readContract throws a typed SDK error.
  if (typeof client.multicall === "function") {
    const multicall = client.multicall.bind(client);
    decorated.multicall = async (args: Parameters<typeof multicall>[0]) => {
      try {
        return await multicall(args);
      } catch (e) {
        const failure = recover(e);
        if (failure) throw failure;
        // A chain that cannot serve Multicall3 (none declared, or declared at a block
        // newer than the one being read) is a CAPABILITY answer, not a failed RPC.
        // Callers switch on it to fall back to individual reads, so it must keep its
        // class — flattening it into RpcError here would make that check unreachable.
        if (e instanceof ChainDoesNotSupportContract) throw e;
        throw Revert.toSdkError(e, "multicall", {
          address: (args as { contracts?: { address?: string }[] }).contracts?.[0]?.address,
        });
      }
    };
  }

  // The BLOCK PIN, which is a read even though it executes no contract call.
  // Reads that must describe one instant open with `getBlockNumber()` and quote
  // its result on every call below it, so a failure here fails the whole read.
  // Without this wrapper it failed with a raw viem error while every other leg
  // of the same read threw a typed one.
  //
  // No capability escape hatch like multicall's: there is no "this chain cannot
  // serve block numbers" answer a caller switches on, so every failure is RPC.
  if (typeof client.getBlockNumber === "function") {
    const getBlockNumber = client.getBlockNumber.bind(client);
    decorated.getBlockNumber = async (args?: Parameters<typeof getBlockNumber>[0]) => {
      try {
        return await getBlockNumber(args);
      } catch (e) {
        const failure = recover(e);
        if (failure) throw failure;
        throw Revert.toSdkError(e, "getBlockNumber");
      }
    };
  }

  // The native balance read. Collateral checks and the bridge's destination
  // liquidity check call it before they send, so a failure must be typed.
  if (typeof client.getBalance === "function") {
    const getBalance = client.getBalance.bind(client);
    decorated.getBalance = async (args: Parameters<typeof getBalance>[0]) => {
      try {
        return await getBalance(args);
      } catch (e) {
        const failure = recover(e);
        if (failure) throw failure;
        throw Revert.toSdkError(e, "getBalance");
      }
    };
  }

  return { ...client, ...decorated };
}

// ---- retired genesis: a denylist of block-1 hashes per chain id ----

/**
 *  Block-1 hashes of genesis generations that a chain id has left behind.
 *
 *  Hideki regenesised on 2026-09-17 on the SAME chain id 50383, and the v1
 *  RPC still answers. A signature does not tell the two chains apart, and the
 *  same address holds different contracts on each, so an RPC on v1 must not
 *  serve an owner bound to 50383. Block 1 does tell them apart.
 *
 *  A denylist, not an allowlist of today's genesis: a pinned SDK then keeps
 *  working when the chain regenesises again.
 */
const RETIRED_GENESIS: ReadonlyMap<number, ReadonlyMap<Hex, string>> = new Map([
  [50383, new Map([["0x0ddf6446070d043158fd7aa80d3c835a9e446efdc05601f9ad67eebc9864a4ae", "Hideki v1"] as const])],
]);

/** Private joined genesis verification over one owned attempt. */
export type GenesisCheck = (observed?: (failure: SomniaMarketsSocketFailure) => void) => Promise<void>;

/**
 *  Build an owner's check that its RPC is not on a retired genesis of its chain.
 *
 *  Returns `undefined` for a chain id with no retired genesis, so those owners
 *  make no extra request. Otherwise the check reads block 1 once. A hash on the
 *  denylist throws {@link NotConfiguredError}. Any other hash passes and is
 *  kept, and so does a node that no longer serves block 1: a missing block is
 *  not evidence of a retired genesis. A refusal or a failed block read
 *  ({@link RpcError}) is not kept, so the next read checks again.
 */
export function makeGenesisCheck(
  chainId: number,
  client: PublicClient,
  observedClient?: (observed: (failure: SomniaMarketsSocketFailure) => void) => PublicClient,
): GenesisCheck | undefined {
  const retired = RETIRED_GENESIS.get(chainId);
  if (!retired) return undefined;
  const verify = async (selected: PublicClient): Promise<void> => {
    let hash: Hex | null;
    try {
      hash = (await selected.getBlock({ blockNumber: 1n })).hash;
    } catch (cause) {
      if (cause instanceof BlockNotFoundError) return;
      if (cause instanceof SomniaMarketsError) throw cause;
      throw new RpcError("getBlock", "genesis check failed", { cause });
    }
    const generation = hash === null ? undefined : retired.get(hash);
    if (generation === undefined) return;
    throw new NotConfiguredError(
      `an RPC on the current genesis of chain ${chainId} (this RPC serves the retired ${generation} genesis)`,
      `chain reads on chain ${chainId}`,
    );
  };
  type Observer = (failure: SomniaMarketsSocketFailure) => void;
  interface Attempt {
    promise: Promise<void>;
    failure?: SomniaMarketsSocketFailure;
    readonly observers: Set<Observer>;
  }
  const deliver = (observer: Observer, failure: SomniaMarketsSocketFailure): void => {
    try {
      observer(failure);
    } catch {
      // Private observation cannot replace the request's failure or interrupt joins.
    }
  };
  let verified: Attempt | undefined;
  return (observed) => {
    const existing = verified;
    const attempt: Attempt = existing ?? { promise: Promise.resolve(), observers: new Set<Observer>() };
    if (observed) {
      attempt.observers.add(observed);
      if (attempt.failure) deliver(observed, attempt.failure);
    }
    if (!existing) {
      verified = attempt;
      attempt.promise = Promise.resolve()
        .then(() => {
          const selected =
            observedClient?.((failure) => {
              if (attempt.failure) return;
              attempt.failure = failure;
              // Reentrant joins receive their receipt directly; do not revisit additions.
              const listeners = new Set(attempt.observers);
              for (const observer of listeners) deliver(observer, failure);
            }) ?? client;
          return verify(selected);
        })
        .catch((error: unknown) => {
          if (verified === attempt) verified = undefined;
          throw error;
        });
    }
    return attempt.promise.finally(() => {
      if (observed) attempt.observers.delete(observed);
      if (attempt.observers.size === 0) delete attempt.failure;
    });
  };
}

/**
 *  Wrap a client (the viem client, or the `/native` surface) so every async
 *  method awaits `check` first. The check runs outside the wrapped method, so
 *  its typed error reaches the caller as it is. `watch*` methods and `extend`
 *  return synchronously and are left as they are.
 *
 *  Returns a new object and never mutates the argument (SDK-OWN-003).
 */
export function withGenesisCheck<T extends object>(client: T, check: () => Promise<void>): T {
  const gated: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(client)) {
    if (typeof value !== "function" || key === "extend" || key.startsWith("watch")) continue;
    gated[key] = async (...args: unknown[]) => {
      await check();
      return Reflect.apply(value, client, args);
    };
  }
  return { ...client, ...gated };
}

// ---- chain heads: the newHeads subscription ----
//
// This lives at the transport boundary, not in the live plane that consumes it
// (SDK-IO-001). `liveTail` receives {@link subscribeChainHeads} already bound to
// its client and never sees a transport: the socket, the frame shape, the
// normalization and the release lifecycle are all owned here.

/** The height and time the tail takes from a chain head. */
export interface ChainHead {
  number: bigint;
  timestamp: bigint;
}

/** True for a hex string that actually carries a quantity. `isHex` alone is not
 *  enough: it accepts the empty quantity `"0x"`, which `hexToBigInt` throws on. */
function isHexQuantity(v: unknown): v is Hex {
  return isHex(v) && v.length > 2;
}

/** Height and time from a `newHeads` frame — null unless BOTH arrive as hex
 *  quantities. All-or-nothing: a frame missing either field, or carrying one that
 *  is not hex or is the empty quantity `"0x"`, is rejected whole rather than
 *  half-read, because a head with only one of the two is no use to the tail.
 *  Total: a malformed frame is contained here, never thrown at the subscription
 *  callback.
 *  @internal Exported for tests. */
export function headOfFrame(result: unknown): ChainHead | null {
  if (typeof result !== "object" || result === null) return null;
  const height = Reflect.get(result, "number");
  const timestamp = Reflect.get(result, "timestamp");
  if (!isHexQuantity(height) || !isHexQuantity(timestamp)) return null;
  return { number: hexToBigInt(height), timestamp: hexToBigInt(timestamp) };
}

/**
 *  Subscribe to the logs a contract emits with `account` as an indexed argument, and
 *  call `onLog` for each. The returned function releases the streams.
 *
 *  **Details**
 *
 *  Three `eth_subscribe("logs")` filtered on `address` and on the account in topic 1,
 *  2 or 3, so the node sends only this account's events. Most MarginBank events that
 *  change an account name it in topic 1 (`PositionUpdated`, `Deposited`, `Withdrawn`,
 *  the collateral locks, fees and liquidations). Some name it later:
 *  `PositionTransferred` names the receiver in topic 2, and `AutoDeleveraged` the
 *  bankrupt account in topic 3. A filter matches one topic position, so each position
 *  is its own stream. `onLog` carries only the log's block, `null` when it names none,
 *  because a caller that gets one re-reads the state rather than folding the event.
 *  `onOpen` fires once, when the node has confirmed every stream: a change from then on
 *  reaches `onLog`.
 *
 *  **Gotchas**
 *
 *  Same release and failure rules as {@link subscribeChainHeads}: a release before
 *  the socket opens is applied on arrival, a released stream never calls back, and
 *  `onError` fires at most once, for the first stream that fails.
 */
export function subscribeAccountLogs(
  client: SocketClient,
  address: Address,
  account: Address,
  onLog: (blockNumber: bigint | null) => void,
  onError: () => void,
  onOpen?: () => void,
): () => void {
  const padded = pad(account, { size: 32 });
  return subscribeLogFilters(
    client,
    [
      { address, topics: [null, padded] },
      { address, topics: [null, null, padded] },
      { address, topics: [null, null, null, padded] },
    ],
    (frame) => onLog(logOfFrame(frame)?.blockNumber ?? null),
    onError,
    onOpen,
  );
}

/** The ERC-20 `Transfer(address,address,uint256)` event's topic 0. */
const TRANSFER_TOPIC = toEventSelector("Transfer(address,address,uint256)");

/**
 *  Subscribe to the ERC-20 `Transfer` events of `tokens` that send from or to any of
 *  `accounts`, and call `onLog` for each. The returned function releases both streams.
 *
 *  **Details**
 *
 *  Two `eth_subscribe("logs")` filtered on the token addresses: one with the accounts
 *  as the sender (topic 1), one with them as the receiver (topic 2). A transfer between
 *  two of the accounts arrives on both. `onLog` carries only the log's block, `null` when
 *  it names none, because a caller that gets one re-reads the balances rather than
 *  folding the event. `onOpen` fires once, when the node has confirmed both streams.
 *
 *  **Gotchas**
 *
 *  Same release and failure rules as {@link subscribeChainHeads}. `onError` fires at
 *  most once, for the first stream that fails; the caller releases both and subscribes
 *  again.
 */
export function subscribeTransferLogs(
  client: SocketClient,
  tokens: readonly Address[],
  accounts: readonly Address[],
  onLog: (blockNumber: bigint | null) => void,
  onError: () => void,
  onOpen?: () => void,
): () => void {
  const padded = accounts.map((account) => pad(account, { size: 32 }));
  const address = [...tokens];
  return subscribeLogFilters(
    client,
    [
      { address, topics: [TRANSFER_TOPIC, padded] },
      { address, topics: [TRANSFER_TOPIC, null, padded] },
    ],
    (frame) => onLog(logOfFrame(frame)?.blockNumber ?? null),
    onError,
    onOpen,
  );
}

/**
 *  The MarginBank events that can move one side of a market's ADL queue: each changes a
 *  holder's position or equity. First those about the market's own pool, by the topic
 *  that names it. Then those that change an account's balance: a balance counts on every
 *  market the account holds, so they are followed for any account and any pool.
 *  Signatures as the deployed bank declares them. `accountLogsSubscription.test.ts` pins
 *  them to `indexer/abis/MarginBank.json`, and gives every other bank event the reason it
 *  is left out.
 */
export const ADL_QUEUE_EVENTS = {
  poolInTopic2: [
    "PositionUpdated(address,address,int128,uint128,int256,int256)",
    "AutoDeleveraged(address,address,address,int128,uint256)",
    "FundingSettled(address,address,int256)",
  ],
  poolInTopic3: [
    "PositionTransferred(address,address,address,int128,uint256)",
    "ForcedSettled(address,address,address,int128,uint256,bool,bool)",
  ],
  anyAccount: [
    "Deposited(address,uint256)",
    "Withdrawn(address,uint256)",
    // An order's top-up. The pool it names is the one that pulled the money, which need
    // not be a market the account holds.
    "DepositedFor(address,address,uint256)",
    "AccountCredited(address,uint256,address)",
    "CreditReclaimed(address,uint256,address)",
    // A linked wallet's main funding it, and taking principal back.
    "MainFundedChild(address,address,uint256,uint256)",
    "FundedPrincipalReturned(address,address,uint256,uint256)",
    // A liquidated account's margin, paid to the bidders that take its positions.
    "CloseOutMarginSettled(address,address,uint256)",
  ],
} as const;

/** The topic-0 selector of each event signature, in the same order. */
const topicsOf = (signatures: readonly string[]): Hex[] => signatures.map((signature) => toEventSelector(signature));

/**
 *  Subscribe to the MarginBank events that can move one side of `pool`'s ADL queue,
 *  whoever they are about, and call `onLog` for each. The returned function releases
 *  the streams.
 *
 *  **Details**
 *
 *  Three `eth_subscribe("logs")` filtered on `marginBank` and on the events in
 *  {@link ADL_QUEUE_EVENTS}: `PositionUpdated` (every fill, close and liquidation of a
 *  position), `AutoDeleveraged` and `FundingSettled` with the pool in topic 2;
 *  `PositionTransferred` (a liquidation takeover) and `ForcedSettled` (a wind-down)
 *  with the pool in topic 3; and, for any account and any pool, the events that
 *  change an account's balance: `Deposited`, `Withdrawn`, `DepositedFor` (an order's
 *  top-up, which names the pool that pulled it), `AccountCredited`, `CreditReclaimed`,
 *  `MainFundedChild`, `FundedPrincipalReturned` and `CloseOutMarginSettled` (a
 *  liquidation's payment to the bidders that take its positions). `onLog` carries only the log's
 *  block, `null` when it names none, because a caller that gets one re-reads its state
 *  rather than folding the event. `onOpen` fires once, when the node has confirmed
 *  every stream: a change from then on reaches `onLog`.
 *
 *  **Gotchas**
 *
 *  - Order placement and cancellation (`CollateralLocked`, `CollateralUnlocked`) are
 *    left out. Each one moves the order's margin out of the unlocked balance or back
 *    into it, so it moves the account's equity and its place in the queue, but the
 *    bank emits them several times a second. A change on another market (a trade,
 *    funding, fees) moves the account's equity too, and is not followed either. The
 *    caller sees both at its next read.
 *  - Same release and failure rules as {@link subscribeChainHeads}: a release before
 *    the socket opens is applied on arrival, a released stream never calls back, and
 *    `onError` fires at most once, for the first stream that fails.
 */
export function subscribeAdlQueueLogs(
  client: SocketClient,
  marginBank: Address,
  pool: Address,
  onLog: (blockNumber: bigint | null) => void,
  onError: () => void,
  onOpen?: () => void,
): () => void {
  const padded = pad(pool, { size: 32 });
  return subscribeLogFilters(
    client,
    [
      { address: marginBank, topics: [topicsOf(ADL_QUEUE_EVENTS.poolInTopic2), null, padded] },
      { address: marginBank, topics: [topicsOf(ADL_QUEUE_EVENTS.poolInTopic3), null, null, padded] },
      { address: marginBank, topics: [topicsOf(ADL_QUEUE_EVENTS.anyAccount)] },
    ],
    (frame) => onLog(logOfFrame(frame)?.blockNumber ?? null),
    onError,
    onOpen,
  );
}

/** One `logs` subscription filter: the contracts, and the topics position by position. */
export interface LogFilter {
  readonly address: Address | Address[];
  /** Position by position: one topic, a list any of which matches, or `null` for any. */
  readonly topics: LogTopic[];
}

/** One log a `logs` subscription delivered. */
export interface ChainLog {
  /** The emitting contract, lower-case. */
  readonly address: string;
  readonly topics: readonly Hex[];
  readonly data: Hex;
  /** The block it is in; `null` for a pending log. */
  readonly blockNumber: bigint | null;
  /** Its position in the block; `null` for a pending log. */
  readonly logIndex: number | null;
  /** The transaction that emitted it; `null` for a pending log. */
  readonly transactionHash: Hex | null;
}

/** The log a `logs` subscription frame carries, or `undefined` when it carries none that reads. */
export function logOfFrame(frame: unknown): ChainLog | undefined {
  if (typeof frame !== "object" || frame === null) return undefined;
  const result: unknown = Reflect.get(frame, "result");
  if (typeof result !== "object" || result === null) return undefined;
  const address: unknown = Reflect.get(result, "address");
  const topics: unknown = Reflect.get(result, "topics");
  const data: unknown = Reflect.get(result, "data");
  const blockNumber: unknown = Reflect.get(result, "blockNumber");
  const logIndex: unknown = Reflect.get(result, "logIndex");
  const transactionHash: unknown = Reflect.get(result, "transactionHash");
  if (typeof address !== "string" || !isAddress(address, { strict: false }) || !isHex(data)) return undefined;
  if (!Array.isArray(topics)) return undefined;
  const list: readonly unknown[] = topics;
  const read: Hex[] = [];
  for (const topic of list) {
    if (!isHex(topic)) return undefined;
    read.push(topic);
  }
  return {
    address: address.toLowerCase(),
    topics: read,
    data,
    blockNumber: isHexQuantity(blockNumber) ? hexToBigInt(blockNumber) : null,
    logIndex:
      isHexQuantity(logIndex) && hexToBigInt(logIndex) <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(hexToBigInt(logIndex))
        : null,
    transactionHash: isHex(transactionHash) ? transactionHash : null,
  };
}

/**
 *  Subscribe to the logs that match any of `filters`, and call `onLog` with each. The
 *  returned function releases every stream.
 *
 *  **Details**
 *
 *  One `eth_subscribe("logs")` per filter. `onLog` gets `undefined` for a frame whose
 *  log does not read, because a caller that cannot tell whether a log concerns it reads
 *  its state again rather than miss one. A log that matches two filters arrives twice.
 *  `onOpen` fires once, when the node has confirmed every stream: a log from then on
 *  reaches `onLog`.
 *
 *  **Gotchas**
 *
 *  Same release and failure rules as {@link subscribeChainHeads}: a release before the
 *  socket opens is applied on arrival, a released stream never calls back, and
 *  `onError` fires at most once, for the first stream that fails.
 */
export function subscribeLogs(
  client: SocketClient,
  filters: readonly LogFilter[],
  onLog: (log: ChainLog | undefined) => void,
  onError: () => void,
  onOpen?: () => void,
): () => void {
  return subscribeLogFilters(client, filters, (frame) => onLog(logOfFrame(frame)), onError, onOpen);
}

/**
 *  The logs that match any of `filters` from `fromBlock` to `toBlock`, both included, in
 *  chain order. A log that does not read is `undefined`, as {@link subscribeLogs} hands
 *  it over.
 *
 *  **Details**
 *
 *  One `eth_getLogs` per filter. A log that matches two filters is there twice. Rejects
 *  with `RpcError` when a read does not complete, for example over a range too wide
 *  for the node.
 */
export async function readLogs(
  client: PublicClient,
  filters: readonly LogFilter[],
  fromBlock: bigint,
  toBlock: bigint,
): Promise<(ChainLog | undefined)[]> {
  const batches = await Promise.all(
    filters.map(async (filter) => {
      let result: unknown;
      try {
        result = await client.request({
          method: "eth_getLogs",
          params: [
            {
              address: filter.address,
              topics: filter.topics,
              fromBlock: numberToHex(fromBlock),
              toBlock: numberToHex(toBlock),
            },
          ],
        });
      } catch (error) {
        throw new RpcError("eth_getLogs", error instanceof Error ? error.message : String(error), { cause: error });
      }
      if (!Array.isArray(result)) throw new RpcError("eth_getLogs", "the node answered with no list of logs");
      const list: readonly unknown[] = result;
      return list.map((log) => logOfFrame({ result: log }));
    }),
  );
  return batches.flat().sort(compareLogs);
}

/** Chain order; a log with no position goes last. */
function compareLogs(left: ChainLog | undefined, right: ChainLog | undefined): number {
  const a = left?.blockNumber ?? null;
  const b = right?.blockNumber ?? null;
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (a !== b) return a < b ? -1 : 1;
  return (left?.logIndex ?? Number.MAX_SAFE_INTEGER) - (right?.logIndex ?? Number.MAX_SAFE_INTEGER);
}

/**
 *  Opens one `eth_subscribe("logs")` per filter. `onError` fires at most once for all of
 *  them, and `onOpen` once, when the node has confirmed every one and none failed.
 */
function subscribeLogFilters(
  client: SocketClient,
  filters: readonly LogFilter[],
  onLog: (frame: unknown) => void,
  onError: () => void,
  onOpen?: () => void,
): () => void {
  let active = true;
  let failed = false;
  let opened = 0;
  const releases: (() => void)[] = [];
  const fail = (): void => {
    if (!active || failed) return;
    failed = true;
    onError();
  };
  for (const filter of filters) {
    void client.transport
      .subscribe({
        params: ["logs", filter],
        onData: (frame: unknown) => {
          if (active) onLog(frame);
        },
        onError: fail,
      })
      .then(({ unsubscribe }) => {
        if (!active) {
          void unsubscribe();
          return;
        }
        releases.push(() => void unsubscribe());
        opened += 1;
        if (opened === filters.length && !failed) onOpen?.();
      })
      .catch(fail);
  }
  return () => {
    active = false;
    for (const release of releases.splice(0)) release();
  };
}

/** One `somnia_watch` subscription: the logs that trigger a push, and the calls it carries. */
export interface SomniaWatchRequest {
  /** The contracts whose logs trigger a push. */
  readonly address: readonly Address[];
  /** The topic filter, position by position. `null` matches any value. */
  readonly topics: readonly (Hex | null)[];
  /** The calls the node runs at the block of each matched log. `from` sends a call as that address. */
  readonly ethCalls: readonly { readonly from?: Address; readonly to: Address; readonly data: Hex }[];
}

/**
 *  Subscribe to Somnia's `somnia_watch`: each log that matches `request` arrives with
 *  the results of `request.ethCalls`, which the node runs at that log's block. The
 *  returned function releases the subscription.
 *
 *  **Details**
 *
 *  `somnia_watch` is a Somnia node extension of `eth_subscribe`, so viem's typed
 *  `subscribe` does not accept it. The request goes through the transport's socket
 *  client, as viem's own `subscribe` sends `eth_subscribe`. `onResults` receives the
 *  call results in the order of `request.ethCalls`.
 *
 *  `onOpen` fires once, when the node confirms the subscription: a log from then on
 *  pushes. `onEnd` fires at most once. `rejected`: the node refused the subscription, as a node
 *  without the extension does, or a notification carried no call results. `lost`: the
 *  socket failed, before or after the subscription opened.
 *
 *  **Gotchas**
 *
 *  Same release rules as {@link subscribeChainHeads}: a release before the subscription
 *  opens is applied on arrival, and a released subscription never calls back.
 */
export function subscribeSomniaWatch(
  client: SocketClient,
  request: SomniaWatchRequest,
  onResults: (results: readonly Hex[]) => void,
  onEnd: (end: "rejected" | "lost") => void,
  onOpen: () => void,
): () => void {
  let active = true;
  let ended = false;
  let release: (() => void) | null = null;
  const finish = (end: "rejected" | "lost"): void => {
    if (!active || ended) return;
    ended = true;
    onEnd(end);
  };
  const params = [
    "somnia_watch",
    {
      address: [...request.address],
      topics: [...request.topics],
      eth_calls: request.ethCalls.map(({ from, to, data }) => (from === undefined ? { to, data } : { from, to, data })),
    },
  ];
  void client.transport
    .getRpcClient()
    .then((socket) => {
      // Released before the socket was ready: nothing was sent.
      if (!active) return;
      let subscriptionId: Hex | undefined;
      socket.request({
        body: { method: "eth_subscribe", params },
        onError: () => finish("lost"),
        onResponse(response) {
          if (response.method === "eth_subscription") {
            if (!active || ended) return;
            const results = simulationResultsOf(response.params);
            if (results === undefined) finish("rejected");
            else onResults(results);
            return;
          }
          if (subscriptionId !== undefined) return;
          if (response.error !== undefined || !isHex(response.result)) {
            finish("rejected");
            return;
          }
          const id = response.result;
          subscriptionId = id;
          const unsubscribe = (): void => {
            try {
              socket.request({ body: { method: "eth_unsubscribe", params: [id] }, onResponse: () => undefined });
            } catch {
              // A closed socket has already dropped the subscription.
            }
          };
          if (!active) {
            unsubscribe();
            return;
          }
          release = unsubscribe;
          if (!ended) onOpen();
        },
      });
    })
    .catch(() => finish("lost"));
  return () => {
    active = false;
    release?.();
    release = null;
  };
}

/** The call results a `somnia_watch` notification carries, or `undefined` when it carries none. */
function simulationResultsOf(params: unknown): readonly Hex[] | undefined {
  if (typeof params !== "object" || params === null) return undefined;
  const result: unknown = Reflect.get(params, "result");
  if (typeof result !== "object" || result === null) return undefined;
  const raw: unknown = Reflect.get(result, "simulationResults");
  if (!Array.isArray(raw)) return undefined;
  const list: readonly unknown[] = raw;
  const results: Hex[] = [];
  for (const each of list) {
    if (!isHex(each)) return undefined;
    results.push(each);
  }
  return results;
}

/** Starts a `newHeads` stream and returns its release. See {@link subscribeChainHeads}. */
export type ChainHeadSubscriber = (onHead: (head: ChainHead | undefined) => void, onError: () => void) => () => void;

/**
 *  Subscribe to `newHeads`, delivering each pushed header already parsed. The
 *  returned function releases the stream.
 *
 *  **Details**
 *
 *  The head comes from the pushed frame itself. viem's `watchBlocks` answers a
 *  frame by re-fetching the very block it was handed, which costs a round-trip
 *  per block and returns nothing the frame did not already carry.
 *
 *  `onHead` receives `undefined` for a frame that could not be read. That is
 *  deliberately still a delivery: an unreadable frame proves the stream is alive,
 *  which is what the caller's stall detection needs to know.
 *
 *  **Gotchas**
 *
 *  The socket opens asynchronously, so a release can land before the subscription
 *  exists; it is remembered and applied on arrival. Every continuation is gated on
 *  that release (SDK-OWN-004) — a released stream never calls back, so a frame
 *  already queued cannot revive a stopped caller and a late rejection cannot fire
 *  at whatever replaced it.
 *
 *  `onError` fires AT MOST ONCE. A failed `eth_subscribe` reaches both the
 *  transport callback and the rejected promise, which is one failure arriving
 *  twice, not two failures; a caller that reconnects or notifies subscribers on
 *  it must not do so twice for the same dead stream.
 */
export function subscribeChainHeads(
  client: SocketClient,
  onHead: (head: ChainHead | undefined) => void,
  onError: () => void,
): () => void {
  let active = true;
  let failed = false;
  let release: (() => void) | null = null;

  // The one door for both failure paths: released streams stay silent, and one
  // dead stream reports once however many ways viem tells us it died.
  const fail = (): void => {
    if (!active || failed) return;
    failed = true;
    onError();
  };

  void client.transport
    .subscribe({
      params: ["newHeads"],
      onData: (data) => {
        if (!active) return;
        onHead(headOfFrame(data.result) ?? undefined);
      },
      onError: fail,
    })
    .then(({ unsubscribe }) => {
      if (!active) {
        void unsubscribe().catch(fail);
        return;
      }
      // Released streams suppress callbacks, but still handle a bounded
      // unsubscribe rejection so owner cleanup cannot leave an unhandled promise.
      release = () => void unsubscribe().catch(fail);
    })
    .catch(fail);

  return () => {
    active = false;
    release?.();
    release = null;
  };
}
