// Minimal Hasura GraphQL-over-WebSocket client (the `graphql-transport-ws`
// subprotocol Hasura speaks). One socket multiplexes many subscriptions; the
// client owns connect → connection_init/ack → (re)subscribe, answers server
// pings, and transparently reconnects with exponential backoff, re-issuing every
// live subscription on the fresh socket.
//
// Why hand-rolled: the SDK is dependency-light (viem only), and Hasura's
// subscription protocol is small.
//
// Two kinds of subscription ride this socket, and they heal differently after a
// reconnect:
//
//   - A FULL-STATE subscription (Hasura live query) re-delivers current state on
//     every push, so re-sending the same frame is enough. `Feed` is one.
//   - A STREAMING subscription (Hasura `*_stream`) delivers only rows past a
//     cursor. Re-sending the ORIGINAL frame would replay everything since the
//     first cursor, so its variables must carry the newest cursor at send time.
//     `PricePoint_stream` is one.
//
// `subscribe` therefore takes variables either as a value or as a function
// evaluated on every (re)send. Passing a function is what makes a streaming
// subscription reconnect-safe.
//
// The socket comes from the owner's shared selector (`../webSocket.js`): the
// SDK-managed `ws` transport on Node, the platform constructor in browsers, or
// the owner's explicit constructor. Selection is asynchronous: `connect` returns
// the outcome of its attempt, and every attempt failure reaches `onStatus` and
// retries with backoff.

import type { SomniaMarketsSocketFailure } from "../config.js";
import { IndexerError } from "../errors.js";
import * as OwnedWebSocket from "../webSocket.js";

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 8_000;
/** Each connection attempt gets 10 seconds to open, then 10 seconds to acknowledge. */
const CONNECT_TIMEOUT_MS = 10_000;
const ACK_TIMEOUT_MS = 10_000;

/** graphql-transport-ws subprotocol identifier (RFC-ish; what Hasura expects). */
const SUBPROTOCOL = "graphql-transport-ws";
/** The standard `WebSocket.OPEN` value; Node may have no global `WebSocket`. */
const OPEN = 1;

type NextHandler = (data: unknown) => void;
type ErrorHandler = (err: unknown) => void;

/**
 * Subscription variables, or a function returning them.
 *
 * A function is evaluated on every (re)send, which is how a streaming
 * subscription resumes from its newest cursor instead of its first one.
 */
export type SubscriptionVariables = Record<string, unknown> | (() => Record<string, unknown>);

/** A caller waiting for the selection and construction of one connection attempt. */
interface Waiter {
  resolve(): void;
  reject(failure: SomniaMarketsSocketFailure): void;
}

/** One constructor selection; teardown clears it to cancel construction. */
interface Selection {
  readonly waiters: Waiter[];
}

interface Registered {
  query: string;
  variables: SubscriptionVariables;
  onNext: NextHandler;
  onError?: ErrorHandler;
  /** True once a `subscribe` frame for this id has been sent on the live socket. */
  started: boolean;
}

function resolveVariables(variables: SubscriptionVariables): Record<string, unknown> {
  return typeof variables === "function" ? variables() : variables;
}

/** A live multiplexed Hasura subscription socket for one endpoint. */
export class HasuraWsClient {
  private ws: WebSocket | null = null;
  private selecting: Selection | null = null;
  private acked = false;
  private closed = false;
  private nextId = 1;
  private readonly subs = new Map<string, Registered>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = RECONNECT_BASE_MS;
  /** A hydration owner can keep the connection alive before registering subscriptions. */
  private keepAlive = false;

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
  constructor(
    private readonly url: string,
    private readonly onStatus?: (connected: boolean, error?: SomniaMarketsSocketFailure) => void,
    private readonly infrastructure: OwnedWebSocket.Infrastructure = {},
  ) {}

  /**
   * Begin connecting without subscriptions. The owner must call `close` when finished.
   *
   * Resolves when the attempt has a socket, or when `close` cancels it. Rejects
   * with the typed failure when socket selection or construction fails.
   */
  connect(): Promise<void> {
    this.keepAlive = true;
    return new Promise((resolve, reject) => this.ensureSocket({ resolve, reject }));
  }

  /**
   *  Register a subscription. It is (re)sent whenever the socket is live, and
   *  torn down on the returned unsubscribe.
   *
   *  Pass `variables` as a function when the subscription is a Hasura stream:
   *  it is evaluated on every send, so a reconnect resumes from the newest
   *  cursor rather than replaying from the first one.
   */
  subscribe(query: string, variables: SubscriptionVariables, onNext: NextHandler, onError?: ErrorHandler): () => void {
    const id = String(this.nextId++);
    this.subs.set(id, { query, variables, onNext, onError, started: false });
    this.ensureSocket();
    if (this.acked) this.start(id);
    return () => this.stop(id);
  }

  /** Tear down the socket and forget every subscription. Idempotent. */
  close(): void {
    this.closed = true;
    this.keepAlive = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.subs.clear();
    this.teardownSocket();
    this.onStatus?.(false);
  }

  private start(id: string): void {
    const sub = this.subs.get(id);
    if (!sub || sub.started || !this.ws || this.ws.readyState !== OPEN) return;
    sub.started = true;
    // Variables resolve here, not at registration, so a stream resumes from the
    // cursor it has reached rather than the one it started on.
    this.send({ id, type: "subscribe", payload: { query: sub.query, variables: resolveVariables(sub.variables) } });
  }

  private stop(id: string): void {
    const sub = this.subs.get(id);
    if (!sub) return;
    this.subs.delete(id);
    if (sub.started && this.ws?.readyState === OPEN) this.send({ id, type: "complete" });
    // Last subscription gone → drop the socket (a fresh one opens on next subscribe).
    if (this.subs.size === 0 && !this.keepAlive) {
      // Cancel any pending reconnect first: it would otherwise fire into
      // ensureSocket() and open a socket with nothing subscribed on it.
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      this.closed = false; // allow a future subscribe() to reopen
      this.teardownSocket();
    }
  }

  private ensureSocket(waiter?: Waiter): void {
    if (this.selecting) {
      if (waiter) this.selecting.waiters.push(waiter);
      return;
    }
    if (this.ws || this.closed || this.reconnectTimer) {
      waiter?.resolve();
      return;
    }
    const selecting: Selection = { waiters: waiter ? [waiter] : [] };
    this.selecting = selecting;
    // Selection and construction failures reject this attempt's waiters, reach
    // the owner's status callback and retry; none escapes as an unobserved rejection.
    const fail = (error: unknown, operation: string): void => {
      this.selecting = null;
      // The RPC classification: SDK errors keep their identity; other values become RpcError.
      const failure = OwnedWebSocket.failure(error, operation);
      for (const pending of selecting.waiters) pending.reject(failure);
      this.onStatus?.(false, failure);
      this.scheduleReconnect();
    };
    OwnedWebSocket.getConstructor(this.infrastructure).then(
      (construct) => {
        if (this.selecting !== selecting) return;
        let ws: WebSocket;
        try {
          ws = construct(this.url, SUBPROTOCOL);
        } catch (error) {
          // A reentrant owner close has already cancelled this attempt.
          if (this.selecting === selecting) fail(error, "construct price-feed WebSocket");
          return;
        }
        if (this.selecting !== selecting) {
          // The constructor closed this owner reentrantly; dispose its socket.
          ws.close();
          return;
        }
        this.selecting = null;
        this.open(ws);
        for (const pending of selecting.waiters) pending.resolve();
      },
      (error: unknown) => {
        if (this.selecting === selecting) fail(error, "select price-feed WebSocket");
      },
    );
  }

  private open(ws: WebSocket): void {
    this.ws = ws;
    this.armDeadline(ws, CONNECT_TIMEOUT_MS, "open");
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.armDeadline(ws, ACK_TIMEOUT_MS, "connection_ack");
      this.send({ type: "connection_init" });
    };
    ws.onmessage = (ev: MessageEvent) => {
      if (this.ws === ws) this.onMessage(ev.data);
    };
    ws.onclose = () => this.onDisconnect(ws);
    ws.onerror = () => this.onDisconnect(ws);
  }

  private onMessage(raw: unknown): void {
    let msg: { type?: string; id?: string; payload?: unknown };
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : String(raw));
    } catch {
      return;
    }
    switch (msg.type) {
      case "connection_ack": {
        this.clearDeadline();
        this.acked = true;
        this.reconnectDelay = RECONNECT_BASE_MS;
        this.onStatus?.(true);
        for (const [id, sub] of this.subs) {
          sub.started = false; // fresh socket — resend every subscription
          this.start(id);
        }
        break;
      }
      case "next": {
        const sub = msg.id ? this.subs.get(msg.id) : undefined;
        sub?.onNext((msg.payload as { data?: unknown } | undefined)?.data);
        break;
      }
      case "error": {
        const sub = msg.id ? this.subs.get(msg.id) : undefined;
        sub?.onError?.(msg.payload);
        break;
      }
      case "ping":
        this.send({ type: "pong" });
        break;
      // "complete" / "pong" / "connection_error": nothing to do here.
    }
  }

  private onDisconnect(ws: WebSocket, error?: IndexerError): void {
    if (this.ws !== ws) return; // a stale handler from a socket we already replaced
    this.teardownSocket();
    this.onStatus?.(false, error);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.closed || (this.subs.size === 0 && !this.keepAlive)) return;
    // Exponential backoff; the ack resets the delay.
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureSocket();
    }, delay);
  }

  private armDeadline(ws: WebSocket, timeout: number, phase: "open" | "connection_ack"): void {
    this.clearDeadline();
    this.deadlineTimer = setTimeout(() => {
      this.deadlineTimer = null;
      this.onDisconnect(
        ws,
        new IndexerError("PriceFeedConnection", `WebSocket ${phase} timed out after ${timeout} ms`),
      );
    }, timeout);
  }

  private clearDeadline(): void {
    if (this.deadlineTimer) clearTimeout(this.deadlineTimer);
    this.deadlineTimer = null;
  }

  private teardownSocket(): void {
    const selecting = this.selecting;
    this.selecting = null;
    for (const pending of selecting?.waiters ?? []) pending.resolve();
    this.clearDeadline();
    const ws = this.ws;
    this.ws = null;
    this.acked = false;
    if (!ws) return;
    this.detach(ws);
    try {
      ws.close();
    } catch {
      /* already closing */
    }
  }

  private detach(ws: WebSocket): void {
    ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
  }

  private send(msg: unknown): void {
    if (this.ws?.readyState === OPEN) this.ws.send(JSON.stringify(msg));
  }
}
